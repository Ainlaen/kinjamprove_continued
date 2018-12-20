/* Send data from kinja page to kinjamprove */
var kinjaWindowVar = JSON.stringify(kinja),
	kinjaAccountVar = JSON.stringify(_user),
	kinjaAttr = document.createAttribute('kinja'),
	accountAttr = document.createAttribute('account');
	
//Attach data as JSON strings in case variable don't pass properly.
kinjaAttr.value = kinjaWindowVar;
accountAttr.value = kinjaAccountVar;
document.head.setAttributeNode(kinjaAttr);
document.head.setAttributeNode(accountAttr);

var newEvent = new CustomEvent('kinjamproveGlobalPasser', {detail:{kinja: kinja, account: _user}});
window.dispatchEvent(newEvent);

document.addEventListener('kinjamproveConfirm', function(response) {
	// response.detail contains the transferred data (can be anything, ranging
	// from JavaScript objects to strings).
	if(response.detail == "set"){
		if (!window.realConfirm) {
			window.realConfirm = window.confirm;
		}

		window.confirm = function() {
			console.log('Kinjamprove: Confirming automatically.');
			return true;
		};
	}else{
		window.confirm = window.realConfirm || window.confirm;
	}

});