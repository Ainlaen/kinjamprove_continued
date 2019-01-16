var articleTimes = undefined,
	loadTimesToRemove = [];
	
// Saves options to chrome.storage.sync.
function save_options() {
	var style = document.getElementById('preferredStyle').value,
		// defaultComments = document.getElementById('defaultComments').value,
		sortOrder = document.getElementById('sortOrder').value,
		blockedUsers = document.getElementById('blockedUsers').value,
		hidePendingReplies = document.getElementById('hidePendingReplies').checked,
		hideSidebar = document.getElementById('hideSidebar').checked,
		hideSocialMediaButtons = document.getElementById('hideSocialMediaButtons').checked,
		localizePublishTime = document.getElementById('localizePublishTime').checked,
		defaultToCommunity = document.getElementById('defaultToCommunity').checked,
		minCommentsToLoad = document.getElementById('minCommentsToLoad').value,
		clearSaved = document.getElementById('clear').checked,
		storedLocal = false,
		string;
	
	if (!blockedUsers.length) {
		blockedUsers = '{}';
	}
	minCommentsToLoad = parseInt(minCommentsToLoad);
	if(isNaN(minCommentsToLoad)){
		minCommentsToLoad = 50;
	}
	// console.log('Kinjamprove: saving option "preferred style" =', style);
	// console.log('Kinjamprove: saving option hideSocialMedia =', hideSocialMediaButtons);
	// console.log('Kinjamprove: blockedUsers:', blockedUsers);
	
	var savedTimeTable = document.getElementById('savedTimeTable');
	
	for(let i in articleTimes){
		savedTimeTable.deleteRow(1);
	}
	
	if(clearSaved){
		
		articleTimes = {};

	}else{
		
		for(let i = 0; i < loadTimesToRemove.length; ++i){
			let id = loadTimesToRemove[i];
			if(articleTimes[id]){
				delete articleTimes[id];
			}
		}
	}
	
	string = JSON.stringify(articleTimes);
	
	let numKeys = Object.keys(articleTimes).length;
	
	if(numKeys > 35){
		chrome.storage.local.set({'storedArticleLoadTimes': string});
		storedLocal = true;
		let truncatedList = {},
			counter = 0,
			toStore = numKeys - 35;
		
		for(let articleId in articleTimes){
			++counter;
			if(counter > toStore){
				truncatedList[articleId] = articleTimes[articleId];
			}
		}
		
		string = JSON.stringify(truncatedList);
	}
		
	
	loadTimesToRemove = [];
	setSavedTimesTable(articleTimes);
	
	chrome.storage.sync.set({
		preferredStyle: style,
		hidePendingReplies: hidePendingReplies,
		sortOrder: sortOrder,
		hideSocialMediaButtons: hideSocialMediaButtons,
		hideSidebar: hideSidebar,
		localizePublishTime: localizePublishTime,
		blockedUsers: blockedUsers,
		defaultToCommunity: defaultToCommunity,
		minCommentsToLoad: minCommentsToLoad, 
		storedArticleLoadTimes: string,
		itemsStoredLocal: storedLocal
	}, updateStatus);
	

	// ga('send', 'pageview', '/options.html');
	
	function updateStatus() { 
		var saveButton = document.getElementById('save');
		save.textContent = 'Options saved';		
		save.style.color = 'blue';
		setTimeout(function() {
			save.textContent = 'Save';
			save.style.color = '';
		}, 1000);
	}
}

function restore_options() {
// 	chrome.storage.sync.clear();
	
	chrome.storage.sync.get({
		preferredStyle: 'kinjamprove',
		sortOrder: 'likes',
		hidePendingReplies: false,
		hideSocialMediaButtons: false,
		hideSidebar: false,
		localizePublishTime: false,
		blockedUsers: '{}',
		paused: false,
		defaultToCommunity: false,
		minCommentsToLoad: 50,
		storedArticleLoadTimes: '{}',
		itemsStoredLocal: false
	}, setValues);
		
	function setValues(items) { 
		console.log('Kinjamprove: restored options: ', items);
		
		document.getElementById('preferredStyle').value = items.preferredStyle;
		// document.getElementById('defaultComments').value = items.defaultComments;
		document.getElementById('sortOrder').value = items.sortOrder;
		setBlockedUsersTable(items.blockedUsers);
		articleTimes = JSON.parse(items.storedArticleLoadTimes);
		if(items.itemsStoredLocal){
			chrome.storage.local.get({
				storedArticleLoadTimes: '{}'
			}, function(moreItems){
				let localStored = JSON.parse(moreItems.storedArticleLoadTimes);
				
				for(let i in localStored){
					if(!articleTimes[i]){
						articleTimes[i] = localStored[i];
					}
				}
				setSavedTimesTable(articleTimes);
			});
		}else{
			setSavedTimesTable(articleTimes);
		}
		document.getElementById('blockedUsers').value = items.blockedUsers;
		document.getElementById('blockedUsersText').value = items.blockedUsers;
		
		document.getElementById('hidePendingReplies').checked = items.hidePendingReplies;
		document.getElementById('hideSocialMediaButtons').checked = items.hideSocialMediaButtons;
		document.getElementById('hideSidebar').checked = items.hideSidebar;
		document.getElementById('localizePublishTime').checked = items.localizePublishTime;
		document.getElementById('defaultToCommunity').checked = items.defaultToCommunity;
		document.getElementById('minCommentsToLoad').value = items.minCommentsToLoad;
	}
} // end of restore_options
		
function setBlockedUsersTable(blockedUsers) {
	// blockedUsers = (typeof blockedUsers === 'string') ? JSON.parse(blockedUsers) : blockedUsers;
	
	if (typeof blockedUsers === 'string'){
		if (!blockedUsers.length) {
			blockedUsers = '{}';
		}

		try {
			blockedUsers = JSON.parse(blockedUsers);
		} catch (error) {
			console.error(error);
			blockedUsers = {};
		}
	}

	var blockedUserTable = document.getElementById('blockedUsersTable'),
		rowNum = 1;

	for (var blockedUserId in blockedUsers) {
		// var numOfRows = blockedUserTable.rows.length,
		var row = blockedUserTable.insertRow(rowNum++),
			userName = blockedUsers[blockedUserId],
			toggleBlockButton = '<button class="toggleBlockButton" data-toggle-state="unblock" id="' + blockedUserId + '">Unblock</button>',
			userNameCell = row.insertCell(0),
			toggleBlockButtonCell = row.insertCell(1);
		
		userNameCell.innerHTML = userName;
		userNameCell.className = 'userName';
		toggleBlockButtonCell.outerHTML = '<td class="unblockCol">' + toggleBlockButton + '</td>';
		
		document.getElementById(blockedUserId).addEventListener('click', onToggleBlockButtonClick);
	}
}

function onToggleBlockButtonClick() {
	var blockedUsersElem = document.getElementById('blockedUsers'),
		blockedUsersObj = JSON.parse(blockedUsersElem.value);

	console.log('Kinjamprove: blockedUsersObj:', blockedUsersObj);

	var id = this.id,
		toggleState = this.dataset['toggleState'],
		cell = this.parentElement,
		row = cell.parentElement;

	if (toggleState.indexOf('unblock') > -1) {
		// console.log('blockedUsers:', blockedUsers);
		delete blockedUsersObj[id];

		blockedUsersElem.value = JSON.stringify(blockedUsersObj);
		// document.getElementById('blockedUsers').value = JSON.stringify(blockedUsers);
		// toggleState = 'block';
		this.dataset['toggleState'] = 'block';
		this.innerText = 'Block';
	} else {
		var userName = cell.previousSibling.textContent;
		blockedUsersObj[id] = userName;
		blockedUsersElem.value = JSON.stringify(blockedUsersObj);
		// document.getElementById('blockedUsers').value = JSON.stringify(blockedUsers);
		// toggleState = 'unblock';
		this.dataset['toggleState'] = 'unblock';
		this.innerText = 'Unblock';
	}
}

function setSavedTimesTable(savedTimes){
	
	if (typeof savedTimes === 'string'){
		if (!savedTimes.length) {
			savedTimes = '{}';
		}

		try {
			savedTimes = JSON.parse(savedTimes);
		} catch (error) {
			console.error(error);
			savedTimes = {};
		}
		
		articleTimes = savedTimes;
	}
	
	
	var savedTimeTable = document.getElementById('savedTimeTable'),
		rowNum = 1;
	
	for (var articleId in savedTimes){
		var row = savedTimeTable.insertRow(rowNum++),
			articleName = savedTimes[articleId].hostname +": " + articleId,
			url = savedTimes[articleId].url, 
			headline = savedTimes[articleId].headline,
			toggleRemoveButton = '<button class="toggleRemoveButton" data-toggle-state="remove" id="' + articleId + '">Remove</button>',
			articleNameCell = row.insertCell(0),
			toggleRemoveButtonCell = row.insertCell(1),
			a =  "<a href="+url+" title='"+headline+"'>"+articleName+"</a>";
		
		
		articleNameCell.outerHTML = '<td class="'+articleId+'">' + a + '</td>';
		toggleRemoveButtonCell.outerHTML = '<td class="removeCol">' + toggleRemoveButton + '</td>';
		
		document.getElementById(articleId).addEventListener('click', onToggleRemoveButtonClick);

	}
}

function onToggleRemoveButtonClick() {
	var id = this.id,
		toggleState = this.dataset['toggleState'],
		cell = this.parentElement,
		row = cell.parentElement;
	
	if(toggleState.indexOf('remove') > -1){
		loadTimesToRemove.push(id);
		this.dataset['toggleState'] = 'restore';
		this.innerText ="Restore";
	} else{
		if(loadTimesToRemove.length){
			let index = loadTimesToRemove.indexOf(id);
			if(index > -1){
				loadTimesToRemove[index] = 0;
			}
		}
		this.dataset['toggleState'] = 'remove';
		this.innerText ="Remove";
	}
}


document.addEventListener('DOMContentLoaded', restore_options);
document.addEventListener('DOMContentLoaded', function() {
	document.getElementById('save').addEventListener('click', save_options);
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
// (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
// (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
// m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
// })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

	ga('create', 'UA-110201694-1', 'auto');  // Replace with your property ID.
	ga('set', 'checkProtocolTask', function(){}); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200
	ga('require', 'displayfeatures');
	ga('send', 'pageview', '/options.html');
*/
});


/*
appendRowToTable(document.querySelector('#blockedUsersTable'), ['Appended User', '<button>Unblock</button>']);

function appendRowToTable(table, cellValues) {
   var numOfRows = table.rows.length,
       row = table.insertRow(numOfRows);    
    for (var i = 0; i < cellValues.length; i++) {
        var cell = row.insertCell(i);
        cell.innerHTML = cellValues[i];
    }
}
*/