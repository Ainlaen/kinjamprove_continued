var articleTimes = undefined,
	loadTimesToRemove = [],
	removed_count = 0,
	saved_comment_ids = undefined;

	
document.addEventListener('DOMContentLoaded', function() {
	restore_options();
	document.getElementById('save').addEventListener('click', save_options);
	document.getElementById('remove_saved').addEventListener('click', removeSavedPostsButtonClick);
	let tabs = document.getElementsByClassName('tab');
	tabs[0].addEventListener('click', toggleTabs);
	tabs[1].addEventListener('click', toggleTabs);
	$('span.comments_tab').one('click',loadSavedComments)
});

function toggleTabs(){
	$('span.tab').toggleClass('active');
	$('div.main').toggleClass('hide');
	$('div.saved_posts').toggleClass('hide');
	if(removed_count){
		$('span#remove_saved').toggleClass('hide');
	}
}

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
		itemsStoredLocal: false,
		saved_comment_ids: '{}'
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
		saved_comment_ids = JSON.parse(items.saved_comment_ids);
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

function removeSavedPostsButtonClick(event){
	removed_count = 0;
	$('span#remove_saved').toggleClass('hide');
	
	let checkboxes = document.getElementsByClassName('remove_checkbox'),
		removed_id;

	for(let i = 0; i < checkboxes.length; ++i){
		if(checkboxes[i].checked){
			removed_id = checkboxes[i].dataset.id;
			delete saved_comment_ids[removed_id];
			$('li[data-id="'+removed_id+'"]').hide();
		}
	}
	
	chrome.storage.sync.set({'saved_comment_ids':JSON.stringify(saved_comment_ids)});
	if(!Object.keys(saved_comment_ids).length){
		var $loadingSpan = $('span.loading_span');
		$loadingSpan.siblings().remove();
		$loadingSpan.toggleClass('hide');
		$loadingSpan.text('No Saved Comments');
		return;
	}
	
}

// 0.0.2.4 Saved posts functions

async function getSavedComments(commentIds){
	var comments = [],
		url;
	
	for(let id in commentIds){
		url = getPostURL(id);
		await getJSON(url).then(function(result){
			comments.push(result.data);
		}).catch(function(){
			console.log('Post with ID '+id+' is no longer available.');
			delete saved_comment_ids[id];
			chrome.storage.sync.set({'saved_comment_ids':JSON.stringify(saved_comment_ids)});
		});
	}
	
	return comments;
}

async function loadSavedComments(){
	var $loadingSpan = $('span.loading_span'),
		$div = $('div.saved_posts');

	$loadingSpan.toggleClass('hide');

	if(!Object.keys(saved_comment_ids).length){
		$loadingSpan.html('<p>No Saved Comments</p><p>To save comments, select "Save Comment" from the comment dropdown menu.</p>');
		return;
	}
	
	
	var comments = await getSavedComments(saved_comment_ids),
		$unorderedCommentList = createUnorderedCommentList(comments);
	
	$loadingSpan.toggleClass('hide');
	$div.append($unorderedCommentList);


}

var getPostURL = function(postId){
	return "https://kinja.com/ajax/post/rendered/"+postId+"/full";
};

var xhrPromiseGet = function(url) {
	// Return a new promise.
	return new Promise(function(resolve, reject) {
		// Do the usual XHR stuff
		var req = new XMLHttpRequest();
		req.open('GET', url, true);
		
		req.onload = function() {
			// This is called even on 404 etc.
			// so check the status
			if (req.status === 200) {
				// Resolve the promise w/ the response text
				resolve(req.response);
			} else {
				reject();
				// Otherwise reject w/ the status text
				// which will hopefully be a meaningful error
				//reject(Error(req.statusText));
			}
		};
		
		// Handle network errors
		req.onerror = function() {
			reject(Error('Network Error'));
		};
		
		// Make the request!
		req.send();
	});
};

var getJSON = function(url) {
	return xhrPromiseGet(url).then(JSON.parse);
};

function createElement(elemType, attributes, text) {
	if (arguments.length === 2) {
		if (typeof arguments[1] === 'object') {
			text = null;
		} else { 
			text = arguments[1];
			attributes = null;
		}
	} else if (arguments.length === 1) {
		text = null;
		attributes = null;
    }

	var elem = document.createElement(elemType);

	if (attributes !== null) {
		setNodeAttributes(elem, attributes);
	}
	if (text !== null && text !== '') {
		setNodeText(elem, text);
	}

	return elem;
}

function setNodeAttributes(node, attributes) {
	 for (var attribute in attributes) {
		node.setAttribute(attribute, attributes[attribute]);
	}
}

function setNodeText(node, text) {
	node.appendChild(document.createTextNode(text));
}

function getNodeFromHTML(html) {
	var tempContainer = document.createElement('div');
	tempContainer.innerHTML = html;

	return tempContainer.childNodes[0];
}

function appendNodesToElement(elem, nodesArr) {
	for (var i = 0; i < nodesArr.length; i++) {
		var node = nodesArr[i];
		
		if (typeof node === 'string') {
			node = getNodeFromHTML(node);
		} else if (node[0]) {
			node = node[0];
		}

		if (elem[0]) {
			elem[0].appendChild(node);
		} else {
			elem.appendChild(node);
		}
	}
}


function createUnorderedCommentList(comments) {
	var $commentListItems = [],
		$unorderedCommentList,
		unorderedCommentListObj = { 
			'class': 'commentlist kinjamprove-commentlist'
		};
	
	comments = comments || [];

	for (var i = 0; i < comments.length; i++) {
		var $commentLi = createCommentListItem(comments[i]);
		$commentListItems.push($commentLi);
	}

	$unorderedCommentList = $('<ul>', unorderedCommentListObj).append(...$commentListItems);

	return $unorderedCommentList;
}


function createCommentListItem(comment) {

	var $commentArticle = createCommentArticle(comment),
		depth = isNaN(Number.parseInt(comment.depth)) ? 0 : comment.depth,
		listItemClassArr = [
			'commentlist-item',
			'commentlist__item',
			'commentlist__item--depth-'+depth,
			'commentlist__item--expandable',
			comment.approved ? '' : 'kinjamprove-unapproved'
		],
		listItemClass = listItemClassArr.join(' ').trim(),
		listItemObj = { 
			'class': listItemClass,
			'depth': depth,
			'data-authorid': comment.authorId,
			'data-id': comment.id
		},
		removeCheckboxObj = {
			type: 'checkbox',
			class: 'remove_checkbox',
			'data-id': comment.id
		},
		$removeCheckbox = $('<input>', removeCheckboxObj);

	$removeCheckbox.click(function(){
		if(this.checked){
			++removed_count;
			$(this).parent().css('background-color', '#6161611c');
		}else{
			--removed_count;
			$(this).parent().css('background-color', 'inherit');
		}
		if(removed_count){
			document.getElementById('remove_saved').classList.remove("hide");
		}else{
			document.getElementById('remove_saved').classList.add("hide");
		}
	});

	$listItem = $('<li>', listItemObj).append($removeCheckbox, $commentArticle);

	
	return $listItem;
}

function createCommentArticle(comment) {
		
	var articleObj = { 
			id: 'reply_'+comment.id,
			starterId: comment.starterId,
			class: "reply js_reply"
		},
		$article,
		commentAnchorHTML = '<a id="comment-' + comment.id + '" class="comment-anchor"></a>',
		$header = createCommentHeader(comment),
		$replyContent = createReplyContentDiv(comment);
		
	
	$article = $('<article>', articleObj)
		.append(commentAnchorHTML, $header, $replyContent);


	return $article;
}


function createCommentHeader(comment) {
	var headerObj = { 
		'class': 'reply__header js_author',
		'data-authorid': comment.authorId, 
	    'data-blogid': comment.authorBlogId 
	},
		$avatarContainer = createAvatarContainer(comment),
		$replyByline = createReplyByline(comment),
		$replyPublishTimeDiv = createReplyPublishTimeDiv(comment),
		$header = $("<header>", headerObj)
			.append($avatarContainer, $replyByline, 
					$replyPublishTimeDiv);

	if (!comment.approved) {
		var $pendingApprovalSpan = $('<span>', {'class': 'reply__pending-label hide-for-small'})
			.text("Pending Approval");
		$replyByline.before($pendingApprovalSpan);
	}			

	return $header;
}

function createAvatarContainer(comment) {
	const IMG_SRC_BASE = 'https://i.kinja-img.com/gawker-media/image/upload/c_fill,fl_progressive,g_center,h_80,q_80,w_80/',
		  AVATAR_CONTAINER_CLASS = 'avatar avatar-container js_avatar-container',
		  AVATAR_HREF_BASE = 'https://kinja.com/';
	
	var imgSrc = IMG_SRC_BASE + comment.author.avatar.id + '.' + comment.author.avatar.format,
		avatarImg = createElement('img', { src: imgSrc }),
		avatarHideSpan = createElement('span', { 'class': 'avatar-default hide' }),
		avatarHref =  AVATAR_HREF_BASE + comment.author.screenName,
		avatarContainerObj = { 
			href: avatarHref, 
			'class': AVATAR_CONTAINER_CLASS 
		},
		avatarContainer = createElement('a', avatarContainerObj);
		
	appendNodesToElement(avatarContainer, [ avatarImg, avatarHideSpan ]);

	return avatarContainer;
}

function createReplyPublishTimeDiv(comment) {

	var blogTimezoneFormattedDate = comment.publishTime.Mddyyhmma,
		localizedFormattedDate = publishTimeFormatter(comment.publishTimeMillis),
		replyPublishTimeLinkSpanText = blogTimezoneFormattedDate + " (Permalink)",
		replyPublishTimeLinkSpanTitle = localizedFormattedDate+' (local time)',
		replyPublishTimeLinkObj = { 
			href: comment.permalink, 
			target: '_self', 
			'class': 'kinjamprove-reply-publish-time-link'
		},
		replyPublishTimeLinkSpanObj = {
			'class': 'published updated', 
			title: replyPublishTimeLinkSpanTitle
		},
		replyPublishTimeLinkSpan = createElement('span', replyPublishTimeLinkSpanObj, replyPublishTimeLinkSpanText), 
		replyPublishTimeLink = createElement('a', replyPublishTimeLinkObj), 
		replyPublishTimeDiv = createElement('div', { 'class':  'reply__publish-time' }),
		replySidebar = createReplySidebar(comment); 
	
	replyPublishTimeLink.appendChild(replyPublishTimeLinkSpan);
	replyPublishTimeDiv.appendChild(replyPublishTimeLink);
	replyPublishTimeDiv.appendChild(replySidebar);

	return replyPublishTimeDiv;
}

function createReplyByline(comment) {
	var authorScreenName = comment.author.screenName.toLowerCase(),
		replyBylineAuthorNameObj = {
			href: 'https://kinja.com/' + authorScreenName,  
			target: '_self', 
			'class': 'fn url kinjamprove-author-name', 
		},
		replyBylineAuthorNameText = comment.author.displayName,
		$replyBylineAuthorName = $('<a>', replyBylineAuthorNameObj).text(replyBylineAuthorNameText),
		replyToAuthorNameObj = {
			href: comment.permalinkHost + "/" + comment.parentId,  
			target: '_self'
		},
		replyToAuthorText = comment.replyMeta.parentAuthor.displayName,
		$replyToAuthorName = $('<a>', replyToAuthorNameObj).text(replyToAuthorText),
		$replyToAuthor = $('<span>', { 'class': 'reply__to-author' })
			.append($replyToAuthorName),
		$replyByline  = $('<span>', { 'class': 'reply__byline' });
					 

	$replyByline.append($replyBylineAuthorName, $replyToAuthor);
			
	return $replyByline;
}



function createReplyContentDiv(comment) {
	var postBody = createPostBody(comment),
		replyContentDivObj = { 
			'class': 'reply__content js_reply-content post-content blurable whitelisted-links kinjamprove-post-content' 
		},
		replyContentDiv = createElement('div', replyContentDivObj); 
	
	appendNodesToElement(replyContentDiv, postBody);
	
	return replyContentDiv;
}

function createPostBody(comment) {
	var commentBody = comment.body,
		postBody = [],
		imgSrcBase = 'https://i.kinja-img.com/gawker-media/image/upload/c_scale,fl_progressive,q_80,w_800/';

	for (var i = 0; i < commentBody.length; i++) {
		var bodyPart = commentBody[i],
			type = bodyPart.type,
			containers = bodyPart.containers || [],
			postBodyComponent;
			
		switch(type) {
			case 'Paragraph':
				postBodyComponent = 
					createPostBodyParagraph(bodyPart, containers)
						.replace(/<li>(\s|<br\/?>|&nbsp;)*<\/li>/g, ''); 
				break;
			case 'Image':
				postBodyComponent = createPostBodyImage(bodyPart); 
				break;
			case 'Header':
				postBodyComponent = createPostBodyHeader(bodyPart, containers); 
				break;
			case 'PullQuote':
				postBodyComponent = createPostBodyPullQuote(bodyPart); 
				break;
			case 'HorizontalRule':
				postBodyComponent = createPostBodyHorizontalRule(bodyPart); 
				break;
			case 'YoutubeVideo':
				postBodyComponent = createPostBodyYoutubeVideo(bodyPart);
				break;
			case 'Twitter':
				postBodyComponent = createPostBodyTweet(bodyPart);
				break;
			default: 
				postBodyComponent = undefined;
		}

		if (postBodyComponent) {
			postBody.push(postBodyComponent);
		}
	}
	
	postBody = mergeConsecutiveTags(postBody, 'ul');
	postBody = mergeConsecutiveTags(postBody, 'ol');
	postBody = mergeConsecutiveTags(postBody, 'blockquote');
	return postBody;
}

function createPostBodyParagraph(commentBodyPart, containers) {
	containers = containers || [];

	var p = '<p>',
		isList = false,
		containersHtmlBeg = '',
		containersHtmlEnd,
		bodyPartValues = commentBodyPart.value;

	for (var i = 0; i < containers.length; i++) {
		var container = containers[i], 
			containerType = container.type;

		switch(containerType.toLowerCase()) {
			case 'blockquote': 
				containersHtmlBeg += '<blockquote>';
				break;
			case 'list': 
				if (container.style.toLowerCase() === 'bullet') {
					containersHtmlBeg += '<ul>';
				} else {
					containersHtmlBeg += '<ol>';
				}
				isList = true;
				break;
		}
	}

	containersHtmlEnd = getClosingTagsLastInFirstOut(containersHtmlBeg)
	p = containersHtmlBeg + p;
	
	p = createPostBodyParagraphParts(bodyPartValues, p);

	p += '</p>' + containersHtmlEnd;
	
	if (isList) {
		p = p.replace(/<(\/?)p>/g, '<$1li>');
		// p = p.replace(/<(\/?)p>/g, '');
		// p = p.replace(/<li>(\s|<br>|&nbsp;)*<\/li>/g, '');
	}
	
	return p;

	function getClosingTagsLastInFirstOut(openTagsHtml) {
		return openTagsHtml
			.replace(/>/g, '>#KINJAMPROVE_SPLIT')
			.split('#KINJAMPROVE_SPLIT')
			.reverse()
			.slice(1)
			.join('')
			.replace(/</g, '</');
	}
}

function createPostBodyParagraphParts(bodyPartValues, p){
 	for (var i = 0; i < bodyPartValues.length; i++) {
		var bodyPartValue = bodyPartValues[i],
			bodyPartType = bodyPartValue.type,
			textValue;

		// if (isList) {
		// 	p += '<li>';
		// }

		switch (bodyPartType) {
			case 'LineBreak': 
				textValue = '<br/>'; 
				break;
			case 'Link': 
				textValue = '<a href="' + bodyPartValue.reference + '" target="_blank">';
				if(bodyPartValue.value){
					textValue = createPostBodyParagraphParts(bodyPartValue.value, textValue);
				}
				// for (var j = 0; j < bodyPartValue.value.length; j++) {
					// textValue += bodyPartValue.value[j].value;
				// }
				textValue += '</a>';
				break;
			default: 
				textValue = bodyPartValue.value;
		 }


		var styles = bodyPartValue.styles || [],
			stylesHtmlBeg = '',
			stylesHtmlEnd;

		for (var j = 0; j < styles.length; j++) {
			var style = styles[j];

			switch (style) {
				case 'Italic':    stylesHtmlBeg += '<em>'; break;
				case 'Bold':      stylesHtmlBeg += '<strong>'; break;
				case 'Struck':    stylesHtmlBeg += '<strike>'; break;
				case 'Underline': stylesHtmlBeg += '<u>'; break;
				case 'Code':      stylesHtmlBeg += '<code>'; break;
				case 'Small':     stylesHtmlBeg += '<small>'; break;
			}
		} // end of styles loop



		stylesHtmlEnd = stylesHtmlBeg.replace(/</g, '</');
		p += stylesHtmlBeg + textValue + stylesHtmlEnd;

		// if (isList) {
		// 	p += '</li>';
		// }
	} // end of paragraphs loop
	
	return p;
}

function createPostBodyHeader(commentBodyPart, containers) {
	containers = containers || [];

	var paragraph = createPostBodyParagraph(commentBodyPart, containers),
	  	level = commentBodyPart.level,
	 	headerTag = 'h' + level,
	  	header = paragraph.replace('p', headerTag).replace(/p>$/, headerTag+'>');
	  
	return header;
}

function createPostBodyPullQuote(commentBodyPart) {
	var alignment = commentBodyPart.alignment.toLowerCase(),
		pullquoteAside = '<aside class="pullquote align--' + alignment + '">' +
			'<span class="pullquote__content">';
		for(let i = 0; i < commentBodyPart.value.length; ++i){
			pullquoteAside += commentBodyPart.value[i].value;
		}

		pullquoteAside += '</span></aside>';
			
	return pullquoteAside;
}

function createPostBodyHorizontalRule(commentBodyPart) {		
	switch (commentBodyPart.style) {
		case 'Stars': 
			return '<hr class="storybreak-stars"/>';
		case 'BrandedA': 
		case 'BrandedB':
		default: 
			return '<hr/>';
	}	
}

function mergeConsecutiveTags(postBodyArr, tag) {
	var curPos = 0, 
		endPos = 0,
		newArr = [], 
		temp = '',
		openingTag = '<'+tag+'>',
		closingTag = '</'+tag+'>';
// 			closingRegex = new RegExp(closingTag, 'g'),
// 			regexGlobal = new RegExp('<\/?'+tag+'>', 'g');
		

	while (curPos < postBodyArr.length) {
		temp = postBodyArr[curPos];

		if (isTag(temp)) {
			endPos = curPos + 1;
			temp = temp.replace(closingTag, '');
// 				temp = temp.split(closingTag).join('');
			while (endPos < postBodyArr.length && isTag(postBodyArr[endPos])) {
// 					temp += postBodyArr[endPos].replace(regexGlobal, '');
				temp += postBodyArr[endPos].split(openingTag).join('').split(closingTag).join('');
				endPos++;
				curPos++;
			}
			temp += closingTag;
		}
		newArr.push(temp);
		curPos++;
	}
	
	for (var i = 0; i < newArr.length; i++) {
		var temp = newArr[i];
		if (typeof temp === 'string') {
			temp.replace('>>', '>');
		}
	}

	return newArr;
	

	function isTag(bodyPart) {
		return (typeof bodyPart === 'string' && 
			bodyPart.indexOf('<' + tag + '>') > -1);
	}
}
	
	
function createPostBodyImage(commentBodyPart) {
	var id = commentBodyPart.id,
		width = commentBodyPart.width,
		height = commentBodyPart.height,
		maxWidth = width + 'px',
		imgFormat = commentBodyPart.format.toLowerCase(),
		source = id + '.' + imgFormat,
		sourceSize = width + 'px',
		imgSrcBase = 'https://i.kinja-img.com/gawker-media/image/upload/c_scale,fl_progressive,q_80,w_636/',
		smallMediaSourceBase = 'https://i.kinja-img.com/gawker-media/image/upload/c_fit,fl_progressive,q_80,w_636/',
		smallMediaSource = smallMediaSourceBase + source;

	var marqueeFigureObj = { 'class': 'js_marquee-assetfigure align--center' }, 
		imgWrapperDivObj = { 'class': 'img-wrapper lazy-image ', style: 'max-width: '+maxWidth+';' },
		imgPermalinkSubWrapperDivObj = { 'class': 'img-permalink-sub-wrapper img-permalink-sub-wrapper--nobackground'},
		source1_obj = { 
			'class': 'ls-small-media-source', 
			'data-srcset': smallMediaSource, 
			srcset: smallMediaSource,
			sizes: sourceSize, 
			media: '(max-width: 599px)'
		},
		source2_obj = { 
			'data-srcset': smallMediaSource, 
			srcset: smallMediaSource, 
			sizes: sourceSize, 
			media: '(max-width: 1487px)'
		},
		source3_obj = { 
			'data-srcset': smallMediaSource,
			srcset: smallMediaSource,
			sizes: sourceSize
		}, 
		imgObj = {
			'class': 'ls-lazy-image-tag cursor-pointer lazyautosizes lazyloaded',
			src: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
			'data-sizes': 'auto',
			'data-width': width,
			'data-chomp-id': id,
			'data-format': imgFormat,
			sizes: sourceSize
		};
		

	var $marqueeFigure,
		$imgWrapperDiv,
		$imgPermalinkSubWrapperDiv,
		$picture,
		$source1, $source2, $source3,
		$img;

	$source1 = $('<source>', source1_obj);
	$source2 = $('<source>', source2_obj);
	$source3 = $('<source>', source3_obj);
	$img = $('<img>', imgObj);
						
	$picture = $('<picture>').append($source1, $source2, $source3, $img);
		

	$imgPermalinkSubWrapperDiv = $('<div>', imgPermalinkSubWrapperDivObj).append($picture);
	$imgWrapperDiv = $('<div>', imgWrapperDivObj).append($imgPermalinkSubWrapperDiv);
	$marqueeFigure = $('<figure>', marqueeFigureObj).append($imgWrapperDiv);

	return $marqueeFigure;

}


function createPostBodyYoutubeVideo(commentBodyPart) {
	var id = commentBodyPart.id,
		dataThumbId = commentBodyPart.thumbnail.id,
		dataThumbFormat = commentBodyPart.thumbnail.format,
		asideObj = { 
			'class': 'embed-inset embed-inset--show-overlay align--bleed video-embed', 
			'data-thumb-id': dataThumbId,
			'data-thumb-format': dataThumbFormat, 
			'data-start-time': commentBodyPart.start, 
			contenteditable: false 
		},
		kinjaSandboxObj = { 
			id: 'youtube-video-'+id, 
			contenteditable: false, 
			'class': 'wysiwyg-embed flex-video widescreen' 
		},
		iframeObj = { 
			frameborder: 0, 
			allowfullscreen: true, 
			src: 'https://kinja.com/ajax/inset/iframe?id=youtube-video-'+id, 
			'data-insecure': false, 
			'x-loaded': 1 
		},
		$aside,
		$kinjaSandbox,
		$iframe;
	
	$iframe = $('<iframe>', iframeObj)
		.attr({ 'height': '450', 'width': '800' });

	$kinjaSandbox = $('<kinja-sandbox>', kinjaSandboxObj)
		.append($iframe);

	$aside = $('<aside>', asideObj)
		.append($kinjaSandbox);

	return $aside;
}


function createPostBodyTweet(commentBodyPart) {
	var id = commentBodyPart.id,
		asideObj = { 
			'class': 'embed-inset embed-inset--show-overlay', 
			contenteditable: false 
		},
		kinjaSandboxObj = {
			id: 'twitter-'+id, 
			'class': 'wysiwyg-embed',
			contenteditable: false
		},
		iframeObj = { 
			class: 'twitter-iframe',
			frameborder: 0, 
			allowfullscreen: true, 
			src: 'https://kinja.com/ajax/inset/iframe?id=twitter-'+id+'&autosize=1', 
			'data-insecure': false, 
			'x-loaded': 1 
		},
		aside = createElement('aside', asideObj),
		kinjaSandbox = createElement('kinja-sandbox', kinjaSandboxObj),
		iframe = createElement('iframe', iframeObj);
	kinjaSandbox.appendChild(iframe);
	aside.appendChild(kinjaSandbox);
	
	return aside;
}


function createReplySidebar(comment) { 
	var replySidebarLikeCountSpanObj = { 
			'class': 'like-count js_like_count reply__sidebar' 
		},
		replySidebarLikeCountText = comment.likes || 0,
		replySidebarLikeCountSpan = createElement('span', replySidebarLikeCountSpanObj, replySidebarLikeCountText);
	
	
	return replySidebarLikeCountSpan;

}


function publishTimeFormatter(dateTime) {
	dateTime = new Date(dateTime);

	var hours = dateTime.getHours(),
		minutes = (dateTime.getMinutes() < 10)
			? '0'+dateTime.getMinutes() 
			: dateTime.getMinutes(),
		meridean,
		month = dateTime.getMonth() + 1,
		dayOfMonth = (dateTime.getDate() < 10) 
			? '0'+dateTime.getDate() 
			: dateTime.getDate(),
		year = dateTime.getFullYear().toString().slice(2),
		date = month + '/' + dayOfMonth + '/' + year,
		time;

	if (hours === 12) {
		meridean = 'pm';
	} else if (hours === 0) {
		meridean = 'am';
		hours = 12;
	} else if (hours > 12) {
		meridean = 'pm';
		hours -= 12;
	} else {
		meridean = 'am';
	}

	time = hours + ':' + minutes + meridean;

	return date + ' ' + time;
}

