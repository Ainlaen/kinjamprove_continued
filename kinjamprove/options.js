// Saves options to chrome.storage.sync.
function save_options() {
	var style = document.getElementById('preferredStyle').value,
		// defaultComments = document.getElementById('defaultComments').value,
		sortOrder = document.getElementById('sortOrder').value,
		blockedUsers = document.getElementById('blockedUsers').value,
		hidePendingReplies = document.getElementById('hidePendingReplies').checked,
		hideSidebar = document.getElementById('hideSidebar').checked,
		hideSocialMediaButtons = document.getElementById('hideSocialMediaButtons').checked,
		localizePublishTime = document.getElementById('localizePublishTime').checked;
	
	if (!blockedUsers.length) {
		blockedUsers = '{}';
	}
	
	console.log('saving option "preferred style" =', style);
	console.log('saving option hideSocialMedia =', hideSocialMediaButtons);
	console.log('blockedUsers:', blockedUsers);
	
	chrome.storage.sync.set({
		preferredStyle: style,
		// defaultComments: defaultComments,
		hidePendingReplies: hidePendingReplies,
		sortOrder: sortOrder,
		hideSocialMediaButtons: hideSocialMediaButtons,
		hideSidebar: hideSidebar,
		localizePublishTime: localizePublishTime,
		blockedUsers: blockedUsers,
		
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

/*
MY BLOCKED USERS:
{"562376079":"elkris","578441844":"notabigbang","1162121431":"jhota42","1224058084":"jjdebenedictis","1374577520":"walkerd","1436983725":"garland137","1451381255":"tipsyt-rex","1501614585":"calliaracle","1514615714":"oldwomanyellsatclods","1563330134":"simon-on-the-river3","1625590789":"the-guy-they-warned-you-about","5876237249237745904":"jekevejoy-01","5876237249237538716":"soverybored","5780744385189707111":"trent100","5876237249236158102":"billynoname","5876237249236444308":"chisicilian","5876237249237760155":"spaghettidotgov","5876237249236537310":"josephschmoe33","5876237249235692381":"rexryan301","5876237249237731071":"nabb","5876237249237657184":"johnoliver-watch","5876237249236924363":"pizzagateinvestigator","5876237249237215857":"jsnsnsj","5876237249237797182":"zorny","5876237249237806717":"donkeypuncabitch","5876237249237760043":"thekinjaplace","5876237249237683683":"mrmerrymaker"}
*/

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
	}, setValues);
		
	function setValues(items) { 
		console.log('restored options: ', items);
		
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

	console.log('blockedUsersObj:', blockedUsersObj);

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