var BG = chrome.extension.getBackgroundPage();


function restoreState() {
	chrome.storage.sync.get({
		paused: false,
	}, function(items) {
		var isPaused = items.paused;

		restorePauseState(isPaused);
	});
}

function restorePauseState(isPaused) {
	var pauseButton = document.getElementById('pauseButton'), 
		pauseState = pauseButton.value,
		icon;		
		
	if (isPaused) { 
		pauseButton.innerText = 'Unpause Kinjamprove';
		pauseButton.value = 'paused';
	} else {
		pauseButton.innerText = 'Pause Kinjamprove';
		pauseButton.value = 'unpaused';
	}
}


function togglePause(event) {
	console.log('Kinjamprove: togglePause button clicked; event:', event);
	
	var isPaused = (this.value === 'paused'),
		pauseButton = this,
		innerText = '',
		value = '',
		message = '';
	
	if (isPaused) {
		innerText = 'Pause Kinjamprove';
		value = 'unpaused';	
	} else {
		innerText = 'Unpause Kinjamprove';
		value = 'paused';
	}
	
	message = value.charAt(0).toUpperCase()  + value.substring(1) + ' Kinjamprove';
	chrome.storage.sync.set({
			paused: !isPaused,
		}, function() {
			console.log(message);
			pauseButton.value = value;
			pauseButton.innerText = innerText;
		});
	
	var msgObj = { to: "background", key: "pausedState", val: value };
	// 0.0.1.8
	chrome.runtime.sendMessage(msgObj);
	/* Seems unused.
	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, { message: message }, function(response) {
		//If you need a response, do stuff with it here
		});
	
	});*/
}

function openOptions(event){
	window.open(chrome.runtime.getURL('options.html'));
}

function showColorsPanel(){
	chrome.tabs.query(
		{
			active: true, 
			currentWindow: true 
		}, 
		function(tabs){
			chrome.tabs.sendMessage(tabs[0].id, 'showColorPanel');
		}
	);
}

document.addEventListener('DOMContentLoaded', function() {
	restoreState();
	document.getElementById('pauseButton').addEventListener('click', togglePause);
	document.getElementById('optionsButton').addEventListener('click', openOptions);
	document.getElementById('colorsButton').addEventListener('click', showColorsPanel);
});

