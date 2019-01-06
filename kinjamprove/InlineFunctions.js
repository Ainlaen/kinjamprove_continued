function onKinjamproveCancelButtonClick(elem) {
	//console.log('onKinjamproveCancelButtonClick called on elem:', elem);

	var $this = $(elem),
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

/*
function onKinjamproveAutoCancelButtonClick(event) {
    // console.log('onKinjamproveAutoCancelButtonClick:', event);

    var $cancelButton = $('div.editor button[type="cancel"]');
    
    if (!$cancelButton.length) {
    	console.log('Kinjamprove: $cancelButton not found; returning;');
    	return;
    }

    console.log('Kinjamprove: $cancelButton:', $cancelButton);

    //$cancelButton[0].click();
}
*/