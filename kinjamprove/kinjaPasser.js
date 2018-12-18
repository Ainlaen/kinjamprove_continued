/* Send data from kinja page to kinjamprove */
document.dispatchEvent(new CustomEvent('kinjamproveGlobalPasser', {
	detail:{
		kinja: window.kinja,
		account: window._user
		}
}));

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