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
		minCommentsToLoad = document.getElementById('minCommentsToLoad').value;
	
	if (!blockedUsers.length) {
		blockedUsers = '{}';
	}
	minCommentsToLoad = parseInt(minCommentsToLoad);
	if(isNaN(minCommentsToLoad)){
		minCommentsToLoad = 50;
	}
	console.log('Kinjamprove: saving option "preferred style" =', style);
	console.log('Kinjamprove: saving option hideSocialMedia =', hideSocialMediaButtons);
	console.log('Kinjamprove: blockedUsers:', blockedUsers);
	
	chrome.storage.sync.set({
		preferredStyle: style,
		// defaultComments: defaultComments,
		hidePendingReplies: hidePendingReplies,
		sortOrder: sortOrder,
		hideSocialMediaButtons: hideSocialMediaButtons,
		hideSidebar: hideSidebar,
		localizePublishTime: localizePublishTime,
		blockedUsers: blockedUsers,
		defaultToCommunity: defaultToCommunity,
		minCommentsToLoad: minCommentsToLoad
		
	}, updateStatus);

	// ga('send', 'pageview', '/options.html');
	
	function updateStatus() { 
		var status = document.getElementById('status');
		status.textContent = 'Options saved.';		
		
		setTimeout(function() {
			status.textContent = '';
		}, 750);
	}
}

function restore_options() {
// 	chrome.storage.sync.clear();
	
	chrome.storage.sync.get({
		preferredStyle: 'kinjamprove',
		sortOrder: 'likes',
		// defaultComments: 'pending',
		hidePendingReplies: false,
		hideSocialMediaButtons: false,
		hideSidebar: false,
		localizePublishTime: false,
		blockedUsers: '{}',
		paused: false,
		defaultToCommunity: false,
		minCommentsToLoad: 50
	}, setValues);
		
	function setValues(items) { 
		console.log('Kinjamprove: restored options: ', items);
		
		document.getElementById('preferredStyle').value = items.preferredStyle;
		// document.getElementById('defaultComments').value = items.defaultComments;
		document.getElementById('sortOrder').value = items.sortOrder;

		setBlockedUsersTable(items.blockedUsers);
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