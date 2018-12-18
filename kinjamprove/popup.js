var BG = chrome.extension.getBackgroundPage();
// console.log('background page (aka "BG"):', BG); 
// console.log('BG.sessionStorage:', BG.sessionStorage);

function restoreState() {
	chrome.storage.sync.get({
		paused: false,
		hideSidebar: false,
	}, function(items) {
		// console.log('items:', items);
		
		var isPaused = items.paused;

		restorePauseState(isPaused);

		// if (isPaused) { 
		// 	pauseButton.innerText = 'Unpause Kinjamprove';
		// 	pauseButton.value = 'paused';
		// 	// icon = '/icons/kinjamprove-logo-symmetrical-black-32.png';
		// } else {
		// 	pauseButton.innerText = 'Pause Kinjamprove';
		// 	pauseButton.value = 'unpaused';
		// 	// icon = '/icons/kinjamprove-logo-symmetrical-green-32.png';
		// }

		// console.log('pauseButton.innerText:', pauseButton.innerText);
		// console.log('pauseButton.value:', pauseButton.value);
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

	//ga('send', 'event', 'Button', 'click', value)//, 'opt_label', opt_value, {'nonInteraction': 1});
	
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

document.addEventListener('DOMContentLoaded', function() {
	restoreState();
	document.getElementById('pauseButton').addEventListener('click', togglePause);

/*
	(function(i,s,o,g,r,a,m) {
		i['GoogleAnalyticsObject'] = r;
		i[r] = i[r] || function() {
			(i[r].q = i[r].q || [ ]).push(arguments)
		}, 
		i[r].l = 1 * new Date();
		a = s.createElement(o),
		m = s.getElementsByTagName(o)[0];
		a.async = 1; 
		a.src = g;
		m.parentNode.insertBefore(a, m)
	})(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');

	ga('create', 'UA-110201694-1', 'auto');  
	ga('set', 'checkProtocolTask', function(){}); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200
	ga('require', 'displayfeatures');
	ga('send', 'pageview', '/options.html');
*/

});

