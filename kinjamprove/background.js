// When the extension is installed or upgraded ...
chrome.runtime.onInstalled.addListener(function() {
	// Replace all rules ...
 	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		// With a new rule ...
		chrome.declarativeContent.onPageChanged.addRules([
		{
			// That fires when a page's URL matches ...
			conditions: [
				new chrome.declarativeContent.PageStateMatcher({
					pageUrl: { urlMatches: '(kinja|jezebel|jalopnik|gizmodo|deadspin|fusion|kotaku|lifehacker|theroot|splinternews|avclub|earther|thetakeout|clickhole|theinventory).com', },
					css: ['section#js_discussion-region'],
				})
			],
			// And shows the extension's page action.
			actions: [ new chrome.declarativeContent.ShowPageAction() ]
		  }
		]);
 	});
});

const ICON_PATH = '/icons/';
const ACTIVE_ICON_NAME = 'kinjamprove-logo-green-transparent-background-32x32.png';
const PAUSED_ICON_NAME = 'kinjamprove-logo-symmetrical-black-transparent-background-32x32.png';
const ACTIVE_ICON_PATH = ICON_PATH + ACTIVE_ICON_NAME; 
const PAUSED_ICON_PATH = ICON_PATH + PAUSED_ICON_NAME;

// Show changelog for new versions.
chrome.runtime.onInstalled.addListener(function(details){
	if(details.reason == "update"){
		var thisVersion = chrome.runtime.getManifest().version;
		if(details.previousVersion != thisVersion){
			let VHURL = "https://github.com/Ainlaen/kinjamprove_continued/blob/master/version%20history";
			chrome.tabs.create({ url: VHURL });
		}
     }
});

// 0.0.1.9 Unused idea to check if Kinjamprove tab is active before loading.
// var activeTabId;
// chrome.tabs.onActivated.addListener(function(activeInfo){
	// activeTabId = activeInfo.tabId;
	// let time = new Date();
	// chrome.tabs.sendMessage(activeInfo.tabId, {activeTabId: activeTabId});
// });

// Listen for any changes to the URL of tab
chrome.tabs.onUpdated.addListener(checkForValidUrl);
chrome.tabs.onActivated.addListener(handleActivated);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	console.log('Kinjamprove: Background received request:', request, 'sender:', sender);

	if (request.to === 'background') {
		var messageLowercase = request.val; 
		//console.log('message.toLowerCase():', messageLowercase);
		// 0.0.1.9 Unused idea to check if Kinjamprove tab is active before loading.
		// if (messageLowercase == "istabactive"){
			// if(!activeTabId){
				// chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
					// activeTabId = tabs[0].id;
				// });
			// }
			// chrome.tabs.sendMessage(activeTabId, {activeTabId: activeTabId});
		// }
		if (messageLowercase.indexOf('paused') > -1) {
			var icon = (messageLowercase.startsWith('un')) 
				? ACTIVE_ICON_PATH
				: PAUSED_ICON_PATH;

			//window.sessionStorage.pausedState = messageLowercase;
			//console.log('window.sessionStorage:', window.sessionStorage);

			var lastTab = null, 
				lastTabId = null;

			chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
				lastTab = tabs[0];
	    		lastTabId = tabs[0].id;
	    		//console.log('lastTabId = ', lastTabId, ', lastTab.url: ', lastTab.url, ', lastTab: ', lastTab);

	    		// console.log('icon:', icon);
				// console.log('chrome.pageAction:', chrome.pageAction);
				// console.log('chrome.tabs:', chrome.tabs);

				var iconUrl = chrome.runtime.getURL(icon),
					setIconObj = {
						tabId: lastTabId,
						path: { 
							19: icon,
							38: icon
						}
					};
				
				chrome.pageAction.setIcon(setIconObj);
				chrome.tabs.reload(lastTabId);
    		});	
		} else if (messageLowercase.indexOf('hidesidebar') > -1) {

		} else if (messageLowercase === 'track') {
			// console.log('track event request:', request);
 
			/* vvv FOR DEBUGGING vvv */
			if (true) {
				return;
			}
	
			// var category = request.category,
			 	// action = request.action, 
			 	// label = request.label;

			 // ga('send', {
			 	// hitType: 'event',
			 	// eventCategory: category,
			 	// eventAction: action, 
			 	// eventLabel: label
			 // });
		} else if (messageLowercase.indexOf('dismiss') > -1) {
			
			chrome.storage.sync.set({ paused: true });
			//var icon = PAUSED_ICON_PATH;

			//window.sessionStorage.pausedState = 'paused';
			// console.log('window.sessionStorage:', window.sessionStorage);


			// chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
				// let lastTabId = tabs[0].id;
				// var iconUrl = chrome.runtime.getURL(icon),
					// setIconObj = {
						// tabId: lastTabId,
						// path: { 
							// 19: icon, 
							// 38: icon
						// }
					// };
				// chrome.pageAction.setIcon(setIconObj);
    		// });

			chrome.tabs.create( 
				{ url : request.url }, 
				function(){
					
					var count = 0,
						loaded = false;
					var checkIfLoaded = setInterval(function(){
						
						chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
							loaded = (tabs[0].status == "complete");
						});	
						++count;
						if(loaded || count > 20){
							clearInterval(checkIfLoaded);
							chrome.storage.sync.set({ paused: false });
						}
						
					},250);
				}
			);

		}
	}
});

function isValidUrl(url) {
	const userProfilePattern = /^((https?:\/\/)?(www\.)?)?kinja\.com(\/[\w\-]*)?/i,
		  urlPattern = /^((https?:\/\/)?(www\.)?)([\w\-.]*\.)?(kinja|jezebel|jalopnik|gizmodo|deadspin|splinternews|fusion|kotaku|lifehacker|theroot|avclub|earther|clickhole|theinventory)\.com\/[\w\-#?=]+$/i;

	if (userProfilePattern.test(url)) {
		return false;
	}
	
	return urlPattern.test(url);
}

// Called when the url of a tab changes.
function checkForValidUrl(tabId, changeInfo, tab) {
	// console.log('tabId:', tabId, 'changeInfo:', changeInfo, 'tab:', tab);
	
	if (isValidUrl(tab.url)) {
		// ... show the page action.
		chrome.pageAction.show(tabId);
		console.log('Kinjamprove: MATCHING tab: ', tab.url);
		// console.log('sessionStorage:', sessionStorage);

		chrome.storage.sync.get({
			paused: false,
			preferredStyle: 'kinjamprove',
			sortOrder: 'likes',
			// defaultComments: 'pending',
			hidePendingReplies: false,
			hideSocialMediaButtons: false,
			hideSidebar: false,
			localizePublishTime: false,
			blockedUsers: '{}',
			defaultToCommunity: false,
			minCommentsToLoad: 50
		}, function(items) {
			var icon = items.paused 
				? PAUSED_ICON_PATH 
				: ACTIVE_ICON_PATH;

			var setIconObj = { tabId: tabId, path: { 32: icon } };
			// console.log('checkForValidUrl setIconObj:', setIconObj)

			chrome.pageAction.setIcon(setIconObj);
		});
		
	}else {
		// console.log('NOT matching tab: "%s", (tab.id/tabId: %d/%d)', tab.url, tab.id, tabId);
		// console.log('tab: ', tab);
		
		chrome.pageAction.hide(tabId);
	}
};


// Called when user changes between tabs.
function handleActivated(activeInfo) {
	// console.log('handleActivated');
    // console.log("Tab #" + activeInfo.tabId + " was activated:", activeInfo);
	// console.log('chrome.tabs: ', chrome.tabs);

	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		var lastTab = tabs[0],
    		lastTabId = tabs[0].id,
    		currentUrl = lastTab.url;
    	
    	// console.log('lastTabId = ', lastTabId, ', lastTab.url: ', lastTab.url, ', lastTab: ', lastTab);
    	
    	if (isValidUrl(currentUrl)) {
    		console.log('Kinjamprove:URL is valid: showing pageAction');

    		chrome.storage.sync.get({
				paused: false,
			}, function(items) {
				var icon = items.paused 
					? PAUSED_ICON_PATH
					: ACTIVE_ICON_PATH;

				var setIconObj = { 
					tabId: lastTabId, 
					path: {
						19: icon, 
						38: icon 
					} 
				};
				// console.log('checkForValidUrl setIconObj:', setIconObj)

				chrome.pageAction.setIcon(setIconObj);
			});		
    		chrome.pageAction.show(lastTabId);
    	} else {
    		// console.log('Hiding pageAction');
			
    		chrome.pageAction.hide(lastTabId);
    	}
    });
}

function activeTabPerformCallback(callback) {
	chrome.tabs.query({ active: true, currentWindow: true }, callback);
}

/* 0.0.1.8 Disabled GA stuff.
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

// (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
// (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
// m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
// })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-110201694-1', 'auto');  // Replace with your property ID.

ga('set', 'checkProtocolTask', function(){}); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200
ga('require', 'displayfeatures');
ga('send', 'pageview', '/background.js');
*/