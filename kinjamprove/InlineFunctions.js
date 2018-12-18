function onKinjamproveCancelButtonClick(elem) {
	// console.log('onKinjamproveCancelButtonClick called on elem:', elem);

	var $this = $(elem),
		$nativeCancelButton = $this.siblings('button[type="cancel"]'),
		$editor = $this.closest('div.editor'),
		// $discussionRegion = $this.closest('.js_discussion-region'),
		// $editor = $discussionRegion.find('div.editor'),
		$scribe = $editor.find('.scribe'),
		$kinjamproveAutoCancelButton = $editor.find('button.kinjamprove-auto-cancel-button');

	if ($scribe.length && $scribe.text().length) {
		console.log('Kinjamprove:scribe exists and has text in it: ', $scribe, $scribe.text());

		setTimeout(function() {
			var confirmClose = confirm('Kinjamprove: Are you sure you want to close the editor?');
			
			if (confirmClose) {
				$kinjamproveAutoCancelButton[0].click();
				window.onbeforeunload = null;
			}
		}, 0);
    } else {
    	$kinjamproveAutoCancelButton[0].click();
    }    
}

function setWindowOnbeforeunload(callback) {
	callback = callback || null;
	window.onbeforeunload = callback;
}

function onKinjamproveAutoCancelButtonClick(event) {
    // console.log('onKinjamproveAutoCancelButtonClick:', event);

    var $cancelButton = $('div.editor button[type="cancel"]');
    
    if (!$cancelButton.length) {
    	console.log('Kinjamprove: $cancelButton not found; returning;');
    	return;
    }

     
    Utilities.setWindowConfirmToAutomatic();
    // setWindowConfirmToAutomatic();

    console.log('Kinjamprove: $cancelButton:', $cancelButton);

    $cancelButton[0].click();

    Utilities.setWindowConfirmToNormal();
    // setWindowConfirmToNormal();

    if (typeof commentEditorAPI !== 'undefined') {
    	console.log('Kinjamprove: commentEditorAPI before reset:', commentEditorAPI);
    	commentEditorAPI.reset();
    	console.log('Kinjamprove: commentEditorAPI after reset:', commentEditorAPI);
    } else {
    	console.log('Kinjamprove: commentEditorAPI is undefined');
    }
}

/*
function setWindowConfirmToAutomatic() {
	var $confirmButton = $('#kinjamprove-auto-confirm-button');
	
	if (!$confirmButton.length) {
		$confirmButton = $('<button>', { 
			id: 'kinjamprove-auto-confirm-button', 
			onclick: 'Utilities.setWindowConfirmToAutomatic()', //'Utilities.confirmAutomatically()',
			style: 'display: none; '
		})
		.click(function() {
			//console.log('#kinjamprove-auto-confirm-button clicked:', $(this));
			// console.log('setWindowConfirmToAutomatic $confirmButton clicked; window.confirm', 
				// window.confirm, 'window.realConfirm:', window.realConfirm);
		});
		
		$('body').append($confirmButton);
	}
	
	$confirmButton[0].click();
	
	// if (!window.realConfirm) {
// 		window.realConfirm = window.confirm;
// 	}
// 
// 	window.confirm = function() {
// 		console.log('Confirming automatically.');
// 		window.confirm = window.realConfirm;
// 		return true;
// 	};
	
}
*/

function setWindowConfirmToNormal() {
	var $confirmButton = $('#kinjamprove-normal-confirm-button');
	
	if (!$confirmButton.length) {
		$confirmButton = $('<button>', { 
			id: 'kinjamprove-normal-confirm-button', 
			onclick: 'Utilities.setWindowConfirmToNormal()',
			style: 'display: none; '
		}).click(function() {
			console.log('Kinjamprove: #kinjamprove-normal-confirm-button clicked:', $(this));	
			// console.log('setWindowConfirmToNormal $confirmButton clicked; window.confirm', 
				// window.confirm, 'window.realConfirm:', window.realConfirm);
		});
		
		$('body').append($confirmButton);	
	}
	
	$confirmButton[0].click();
}

