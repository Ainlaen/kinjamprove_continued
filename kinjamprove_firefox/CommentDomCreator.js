/*
*	@elemType: 	 string : (required) : The type (tag) of the element you want to create (i.e. p, div, h2, img, etc.)
*	@properties: object : (optional) : An object containing the properties you want the created item to have (ex.: { 'class': 'example', id: 123 })
*   @text:  	 string : (optional) : The text for the created element to contain
*/
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

function appendNodesToElement(elem, nodesArr) {
	for (var i = 0; i < nodesArr.length; i++) {
		var node = nodesArr[i];
		
		
		if (typeof node === 'string') {
			node = document.createTextNode(node);
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

function createParentCommentTooltip($article) {
    var parentSelector = '#reply_' + $article.attr('data-parentid'),
    	$parent = $(parentSelector),
    	tooltipDivId = 'parent-tooltip_' + $parent.attr('data-id'),
   		$tooltipDiv = $('#' + tooltipDivId),
    	tooltipDiv,
		tooltipImg,
		tooltipContentDiv;
   
	if ($tooltipDiv.length) {
    	return;
    }
    
    var parentAvatar = $parent.find('img:first')[0],
    	parentName = $parent.find('header > span.reply__byline > a.fn.url').text(),
    	parentBodyText = $parent.children('div').children('p').text(),
    	tooltipText = parentBodyText.substring(0, 30);

    if (parentBodyText.length > 30) {
        tooltipText = tooltipText.trim() + '…';
    }                

    tooltipContentDiv = '<div>' + 
        	'<h4>' + parentName + '</h4>' +
        	'<p>' + tooltipText + '</p>' + 
        '</div>';

   
    tooltipDiv = '<div class="parent-comment-tooltip" id="' + tooltipDivId + '">' +
            '<img src="' + parentAvatar.src + '">' +
            tooltipContentDiv + 
            '</div>';
	
	$article.find('a.parent-comment-link').prepend(tooltipDiv);    
}

function createUnorderedCommentList(comments) {
	var $commentListItems = [],
		$unorderedCommentList,
		unorderedCommentListObj = { 
			'class': 'commentlist kinjamprove-commentlist'
		};
	
	comments = comments || [];

	for (var i = 0; i < comments.length; i++) {
		var $commentLi = createNestedCommentsListItem(comments[i]);
		$commentListItems.push($commentLi);
	}

	$unorderedCommentList = $('<ul>', unorderedCommentListObj).append(...$commentListItems);

	return $unorderedCommentList;
}

function createNestedCommentsListItem(comment) {
	var commentListItem = createCommentListItem(comment);
	if (!comment.replies.length) {
		return commentListItem;
	}
	
	for (var i = 0; i < comment.replies.length; i++) {
		var reply = comment.replies[i];
		
		if (!reply.replyMeta.parentAuthor) {
			reply.replyMeta = {
				parentAuthor: {
					displayName: comment.author.displayName
				},
				kinjamprove_provided_parentAuthor: true
			};
		}

		commentListItem.append(createNestedCommentsListItem(reply));
	}

	return commentListItem;
}


function createCommentListItem(comment) {
	var tracker = kinjamprove.commentTrackers[comment.starterId],
		$listItem = tracker.commentLis[comment.id];
	
	if($listItem){
		return $listItem;
	}

	var $commentArticle = createCommentArticle(comment, tracker),
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
		$regionWarning = $('<div>', { 'class': 'js_region--warning' }),
		$editorPlaceholder = $('<div>', { 'class': 'js_editor-placeholder', depth: depth });
		
	$listItem = $('<li>', listItemObj).append($commentArticle, $regionWarning, $editorPlaceholder);

	// 0.0.1.8 Add Lis and articles to lists.
	tracker.commentArticles[comment.id] = $commentArticle;
	tracker.commentLis[comment.id] = $listItem;
	
	return $listItem;
}

function createCommentArticle(comment, tracker) {
	var blockedUsers = (kinjamprove && kinjamprove.options && kinjamprove.options.blockedUsers)
		 ? JSON.parse(kinjamprove.options.blockedUsers) 
		 : { };

	 if (!blockedUsers) {
	 	blockedUsers = { };
	 }

	let numPending = comment.numOfDescendants - comment.numOfApprovedDescendants,
		numPendingDirect = comment.directReplyCount - comment.directApprovedReplyCount,
		numDirectApprovedMinusStaff = comment.directApprovedReplyCount - comment.directStaffReplyCount;
		
	var articleClass = comment.articleClass,
		articleObj = { 
			id: 'reply_'+comment.id,
			depth: comment.depth,
			descendants: comment.numOfDescendants,
			adescendants: comment.numOfApprovedDescendants,
			pdescendants: numPending,
			sdescendants: comment.numOfStaffDescendants,
			'd-replies': comment.directReplyCount,
			'd-areplies': comment.directApprovedReplyCount,
			'd-preplies': numPendingDirect,
			'd-sreplies': comment.directStaffReplyCount,
			'class': articleClass, 
			'data-id': comment.id, 
			'data-parentid': comment.parentId, 
			'data-authorname': comment.author.screenName.toLowerCase(),
			'data-authorId': comment.authorId,
			'data-newest': comment.newest, 
			'data-maxthreadlikes': comment.maxThreadLikes,
			starterId: comment.starterId
		},
		$article,
		commentAnchorHTML = '<a id="comment-' + comment.id + '" class="comment-anchor"></a>',
		$header = createCommentHeader(comment),
		$replyContent,
		$replySidebar, 
		$replyToolsDiv,
		$replyCountsDiv,
		$flaggedIndicator;
	
	if(comment.articleTitle){
		articleObj['title'] = comment.articleTitle;
	}

	if(comment.isUserComment && Utilities.commentPublishedInLastFifteenMinutes(comment)){
		articleObj['class'] += ' kinjamprove-user-comment-editable';
		articleObj['title'] = 'Editable';
	}
	
	if (comment.numOfDescendants){
		articleObj['class'] += ' has-descendants';
		if(numPendingDirect){
			articleObj['class'] += ' has-direct-pending';
		}
		if(numDirectApprovedMinusStaff){
			articleObj['class'] += ' has-direct-delta';
		}
	}
	
	if (comment.curated){
		tracker.curatedCommentLoaded = true;
	}
	
	if (blockedUsers.hasOwnProperty(comment.authorId)) {
		articleObj['class'] += ' kinjamprove-blockedUser';
		
		var $replyByline = $header.children('.reply__byline'),
			blockedUserContainerHtml = '<div class="blockedUserMessage">This user is blocked with Kinjamprove.</div>';
		
		$header.nextAll().remove();
		$replyByline.empty().nextAll().remove();
		$replyByline.append(blockedUserContainerHtml).after(createCollapseThreadButton());
		
		
		$header.find('.avatar img').attr('src', chrome.runtime.getURL('icons/kinjamprove_blocked_user_avatar.png'));
		$article = $('<article>', articleObj).append(commentAnchorHTML, $header);
		
		return $article;
	}

	$replyContent = createReplyContentDiv(comment);
	$replySidebar = createReplySidebar(comment); 
	
	// 0.0.1.8 Show replies stuff.
	let divObj = {
			'class': 'reply__tools js_reply-tools',
			'data-analytics-target': 'groupChat'
		},
		linkArr = [{
			'class': 'js_reply-to-selected-post reply__link readonly-hide',
			'data-id': comment.id,
			rel: 'nofollow',
			title: 'Reply',
		}],
		nodeText = ["Reply"];
	
	$replyToolsDiv = createReplyDiv(divObj, linkArr, nodeText);
	
	let title = "Approved replies in thread: " + comment.numOfApprovedDescendants + "\nPending replies in thread: " + numPending,
		activeFilter = tracker.$kinjamproveFilterSelect.val(),
		linkObj = {
			'class': 'kinjamprove-show-replies-text',
			'data-id': comment.id,
			descendants: comment.numOfDescendants,
			adescendants: comment.numOfApprovedDescendants,
			pdescendants: numPending,
			sdescendants: comment.numOfStaffDescendants,
			'd-replies': comment.directReplyCount,
			'd-areplies': comment.directApprovedReplyCount,
			'd-preplies': numPendingDirect,
			'd-sreplies': comment.directStaffReplyCount,
			'd-deltareplies': numDirectApprovedMinusStaff,
			'data-parentid': comment.parentId, 
			'data-authorId': comment.authorId,
			'data-newest': comment.newest, 
			rel: 'nofollow',
			starterId: comment.starterId,
			title: title	
		};	
		
	divObj = {
'class': 'reply__tools js_reply-tools kinjamprove-show-comment-replies-div' + ( ( (activeFilter == "staff" || tracker.hidePending) && (numDirectApprovedMinusStaff || numPendingDirect) ) ? '' : ' hide-show-replies')
	};

	linkArr = [
		linkObj,
		Object.defineProperty((JSON.parse(JSON.stringify(linkObj))), 'class', {value:'kinjamprove-show-replies-approved-link kinjamprove-show-comment-replies-a' + (numDirectApprovedMinusStaff ? '' : ' hide-show-replies-link')}),
		Object.defineProperty((JSON.parse(JSON.stringify(linkObj))), 'class', {value: 'kinjamprove-show-replies-pending-link kinjamprove-show-comment-replies-a' + (numPendingDirect ? '' : ' hide-show-replies-link')}),
		Object.defineProperty((JSON.parse(JSON.stringify(linkObj))), 'class', {value: 'kinjamprove-show-replies-all-link kinjamprove-show-comment-replies-a' + ( (numDirectApprovedMinusStaff && numPendingDirect) ? '' : ' hide-show-replies-link')})
	];
	
	nodeText = [
		"Show Replies: ",
		"Approved (" + numDirectApprovedMinusStaff + ") ",
		"Pending (" + numPendingDirect + ") ",
		"All (" + (numPendingDirect + numDirectApprovedMinusStaff) +") "
	];
	
	$replyCountsDiv = createReplyDiv(divObj, linkArr, nodeText);
	
	$flaggedIndicator = $('<div>', { 'class': 'js_reply-flagged reply__flagged-indicator' }).text('Flagged');
	
	if (comment.userFlagged) {
		$flaggedIndicator.css('display', 'inline');
	}
			

	$article = $('<article>', articleObj)
		.append(commentAnchorHTML, $header, $replyContent, 
				$replySidebar, $replyToolsDiv, $replyCountsDiv, $flaggedIndicator);

	// 0.0.1.8 For show replies links.
	if(comment.numOfDescendants){
		// Type of replies: 0 = pending, 1 = approved, 2 = staff
		let type = 2;
		if(comment.numOfApprovedDescendants - comment.numOfStaffDescendants){
			type = 1;
		}
		if(comment.numOfDescendants - comment.numOfApprovedDescendants){
			type = 0;
		}
		tracker.commentListArticlesDescendantMap.set(comment.id, [type, $article]);
	}
	
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
		$postDropdownDiv = createPostDropdownDiv(comment),
		$header = $("<header>", headerObj)
			.append($avatarContainer, $replyByline, 
					$replyPublishTimeDiv, $postDropdownDiv);

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
		  //AVATAR_ICON_SVG_HTML = '<span class="icon--svg"><svg class="svg-icon small svg-checkmark--small"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#iconset-checkmark--small"></use></svg></span>',
		  AVATAR_HREF_BASE = '//kinja.com/';
	
	var imgSrc = IMG_SRC_BASE + comment.author.avatar.id + '.' + comment.author.avatar.format,
		avatarImg = createElement('img', { src: imgSrc }),
		avatarHideSpan = createElement('span', { 'class': 'avatar-default hide' }),
		avatarHref =  AVATAR_HREF_BASE + comment.author.screenName,
		avatarContainerObj = { 
			href: avatarHref, 
			'class': AVATAR_CONTAINER_CLASS 
		},
		svgSpan = createElement('span', {'class':'icon--svg'}),
		svgElement = document.getElementsByClassName('svg-icon'),
		avatarContainer = createElement('a', avatarContainerObj);
	
	if(svgElement.length){
		svgElement = svgElement[0].cloneNode(true);
		svgElement.classList.value = "svg-icon small svg-checkmark--small";
		svgElement.firstChild.attributes['xlink:href'] = '#iconset-checkmark--small';
		svgElement.firstChild.attributes[0].nodeValue = '#iconset-checkmark--small';
		svgSpan.appendChild(svgElement);
	}
	
	appendNodesToElement(avatarContainer, [ svgSpan, avatarImg, avatarHideSpan ]);

	return avatarContainer;
}
// 0.0.1.8 Added author comment count.
function createReplyPublishTimeDiv(comment) {
	if(!comment.publishTime){
		comment.publishTime = {};
		let publishTime = comment.publishTimeMillis,
			newDate = new Date(publishTime),
			offset = newDate.getTimezoneOffset(),
			blogOffset = kinjamprove.kinja.meta.blog.timezoneOffset;
		
		offset *= 60 * 1000;
		
		newDate = new Date(publishTime + blogOffset + offset);
		
		comment.publishTime.Mddyyhmma = newDate.toLocaleDateString() + " " + newDate.toLocaleTimeString();
		
	}
	var blogTimezoneFormattedDate = comment.publishTime.Mddyyhmma,
		localizedFormattedDate = Utilities.publishTimeFormatter(comment.publishTimeMillis),
		replyPublishTimeLinkSpanText = kinjamprove.options.localizePublishTime 
			? localizedFormattedDate 
			: blogTimezoneFormattedDate,
		replyPublishTimeLinkSpanTitle = kinjamprove.options.localizePublishTime 
			? blogTimezoneFormattedDate+' (blog time)' 
			: localizedFormattedDate+' (local time)',
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
		replyPublishTimeDiv = createElement('div', { 'class':  'reply__publish-time kinjamprove-author-comment-count' }); 
	
	replyPublishTimeLink.appendChild(replyPublishTimeLinkSpan);
	replyPublishTimeDiv.appendChild(replyPublishTimeLink);
	// 0.0.1.8 New stuff
	let commentTracker = kinjamprove.commentTrackers[comment.starterId],
		authorMap = commentTracker.authorMap,
		numComments = commentTracker.authorMap.get(comment.authorId).length,
		replyAuthorCommentsSpanText = 'Replies from author: '+numComments, 
		replyAuthorCommentsSpanTitle = 'Click to show all of this author\'s comments',
		replyAuthorCommentsSpanClass = 'kinjamprove-author-comment-count-span kinjamprove-author-replies_'+comment.authorId,
		replyAuthorCommentsSpan = createElement('span', {'class': replyAuthorCommentsSpanClass, title:replyAuthorCommentsSpanTitle}, replyAuthorCommentsSpanText),
		replyAuthorCommentsLink = createElement('a', {'class': 'kinjamprove-author-comment-count-link'}),
		clickEvent = function(event){
				var check = confirm('Change filter to show this author\'s posts?');
				if(check){
					commentTracker.displayAuthorPosts(comment.authorId);
				}
			}; 
	
	replyAuthorCommentsLink.addEventListener('click', clickEvent);
	replyAuthorCommentsLink.appendChild(replyAuthorCommentsSpan);
	replyPublishTimeDiv.appendChild(replyAuthorCommentsLink);
	

	return replyPublishTimeDiv;
}

function createReplyByline(comment) {
	var authorScreenName = comment.author.screenName.toLowerCase(),
		replyBylineAuthorNameObj = {
			href: '//kinja.com/' + authorScreenName,  
			target: '_self', 
			'class': 'fn url kinjamprove-author-name', 
		},
		replyBylineAuthorNameText = comment.author.displayName,
		$replyBylineAuthorName = $('<a>', replyBylineAuthorNameObj).text(replyBylineAuthorNameText),
		replyToAuthorIconOuterHTML = '<span class="icon--svg u-downsized">' + 
										'<svg class="svg-icon svg-chevron chevron--right">' + 
											'<use xmlns:xlink="http://www.w3.org/1999/xlink"' + 
											' xlink:href="#iconset-chevron-right"></use>' + 
										'</svg>' + 
									 '</span>',
		replyToAuthorText = comment.replyMeta.parentAuthor.displayName,
		$replyToAuthor = $('<span>', { 'class': 'reply__to-author' })
			.append(replyToAuthorIconOuterHTML, replyToAuthorText),
		$replyByline  = $('<span>', { 'class': 'reply__byline' });


	if (authorScreenName === 'mark-bowen1') {
		var authorDisplayName = 'Oh hi, Mark!',
			authorDisplayNameHTML = '',
			displayNameLength = authorDisplayName.length,
			halfLengthRoundedUp = Math.round(displayNameLength / 2),
			firstHalfOfDisplayName = authorDisplayName.slice(0, halfLengthRoundedUp),
			secondHalfOfDisplayName = authorDisplayName.slice(halfLengthRoundedUp);
		
		authorDisplayNameHTML += 
			'<span class="kinjamprove-creator-authorname even">' + 
			firstHalfOfDisplayName + '</span>' +
			'<span class="kinjamprove-creator-authorname odd">' + 
			secondHalfOfDisplayName + '</span>';

		// 	authorDisplayNameArr = authorDisplayName.split(''),

		// for (var i = 0; i < authorDisplayNameArr.length; i++) {
		// 	var evenOrOdd = ((i+1) % 2) 
		// 			? 'even' : 'odd',
		// 		authorDisplayNameLetterSpan = '<span class="kinjamprove-creator-authorname ' + 
		// 			evenOrOdd + '">' + authorDisplayNameArr[i] + '</span>';
		// 
		// 	authorDisplayNameHTML += authorDisplayNameLetterSpan;
		// } 

		$replyBylineAuthorName.html(authorDisplayNameHTML);
	}

	if (comment.replyMeta.kinjamprove_provided_parentAuthor) {
		$replyToAuthor.addClass('kinjamprove-reply-to-author');
	}
									 
	if (comment.depth !== 0) {
		var $parentCommentLink = $('<a>', {
			'starter-id': comment.starterId,
			'parent-id': comment.parentId,
			'class': 'parent-comment-link'
		}).append($replyToAuthor);

		$replyByline.append($replyBylineAuthorName, $parentCommentLink);
	} else {
		$replyByline.append($replyBylineAuthorName, $replyToAuthor);
	}
			
	return $replyByline;
}


function createCollapseThreadButton() {
	 var collapseThreadButtonObj = {
			className: 'kinjamprove-collapse-thread-button collapse',
			title: 'Collapse'
		}, 
		collapseThreadButtonText = '−',
		collapseThreadButtonTextNode = document.createTextNode(collapseThreadButtonText),
		collapseThreadButton = document.createElement('a');
				
   for (var prop in collapseThreadButtonObj) {
   		collapseThreadButton[prop] = collapseThreadButtonObj[prop];
   }
   collapseThreadButton.appendChild(collapseThreadButtonTextNode);

   return collapseThreadButton;
}

function createPostDropdownDiv(comment) {
	var postDropdownDivObj = { 
			'class': 'post-dropdown-ct js_post-dropdown-ct js_post-dropdown-ct-sticky' 
		},
		postDropdownLinkClass = 'post-dropdown-trigger js_post-menu-toggler icon--svg u-highlighted--onhover',
		postDropdownLinkObj = { 
			href: '#', 
			target: '_self',
		   'class': postDropdownLinkClass, 
		   'data-dropdown': 'dropdown-' + comment.id, 
		},
		dropdownSvgIcon = document.getElementsByClassName('svg-icon'),
		postDropdownLink = createElement('a', postDropdownLinkObj), 
		collapseThreadButton = createCollapseThreadButton(),
		postDropdownUl = createPostDropdownUl(comment),
		postDropdownDiv = createElement('div', postDropdownDivObj); 
			
	if(dropdownSvgIcon.length){
		dropdownSvgIcon = dropdownSvgIcon[0].cloneNode(true);
		dropdownSvgIcon.classList.value = "svg-icon giant stroked svg-tools--giant";
		dropdownSvgIcon.firstChild.attributes['xlink:href'] = '#iconset-tools--giant';
		dropdownSvgIcon.firstChild.attributes[0].nodeValue = '#iconset-tools--giant';
	}else{
		dropdownSvgIcon = document.createTextNode('...');
	}
	
	postDropdownLink.appendChild(dropdownSvgIcon);
	appendNodesToElement(postDropdownDiv, [ collapseThreadButton, postDropdownUl, postDropdownLink ]);
		
	return postDropdownDiv;
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
				postBodyComponent = createPostBodyParagraph(bodyPart, containers);
						//.replace(/<li>(\s|<br\/?>|&nbsp;)*<\/li>/g, ''); 
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
	
	postBody = mergeConsecutiveTags(postBody, 'UL');
	postBody = mergeConsecutiveTags(postBody, 'OL');
	postBody = mergeConsecutiveTags(postBody, 'BLOCKQUOTE');
	return postBody;
}

function createPostBodyParagraph(commentBodyPart, containers) {
	containers = containers || [];

	var p = document.createElement('p'),
		isList = false,
		containersHtmlBeg,
		bodyPartValues = commentBodyPart.value;

	for (var i = 0; i < containers.length; i++) {
		var container = containers[i], 
			containerType = container.type;

		switch(containerType.toLowerCase()) {
			case 'blockquote': 
				containersHtmlBeg = document.createElement('blockquote');
				break;
			case 'list': 
				if (container.style.toLowerCase() === 'bullet') {
					containersHtmlBeg = document.createElement('ul');
				} else {
					containersHtmlBeg = document.createElement('ol');
				}
				isList = true;
				break;
		}
	}

	if (isList) {
		p = document.createElement('li');
	}

	p = createPostBodyParagraphParts(bodyPartValues, p);

	if(containersHtmlBeg){
		containersHtmlBeg.appendChild(p);
	}else{
		containersHtmlBeg = p;
	}
	
	return containersHtmlBeg;
}

function createPostBodyParagraphParts(bodyPartValues, p){
 	for (var i = 0; i < bodyPartValues.length; i++) {
		var bodyPartValue = bodyPartValues[i],
			bodyPartType = bodyPartValue.type,
			innerElement = null;

		switch (bodyPartType) {
			case 'LineBreak': 
				innerElement = document.createElement('br');
				break;
			case 'Link': 
				//textValue = '<a href="' + bodyPartValue.reference + '" target="_blank">';
				innerElement = document.createElement('a');
				innerElement.href = bodyPartValue.reference;
				innerElement.target = "_blank";
				if(bodyPartValue.value){
					innerElement = createPostBodyParagraphParts(bodyPartValue.value, innerElement);
				}
				break;
			default: 
				innerElement = document.createTextNode(bodyPartValue.value);
		 }


		var styles = bodyPartValue.styles || [],
			stylesElements = [];

		for (var j = 0; j < styles.length; j++) {
			var style = styles[j];

			switch (style) {
				case 'Italic':    stylesElements.push(document.createElement('em')); break;
				case 'Bold':      stylesElements.push(document.createElement('strong')); break;
				case 'Struck':    stylesElements.push(document.createElement('strike')); break;
				case 'Underline': stylesElements.push(document.createElement('u')); break;
				case 'Code':      stylesElements.push(document.createElement('code')); break;
				case 'Small':     stylesElements.push(document.createElement('small')); break;
			}
		} // end of styles loop
		
		if(stylesElements.length){
			stylesElements[stylesElements.length - 1].appendChild(innerElement);
			for(var j = stylesElements.length - 1; j > 0; j--) {
				stylesElements[j-1].appendChild(stylesElements[j]);
			}
			p.appendChild(stylesElements[0]);
		}else {
			p.appendChild(innerElement);
		}

	} // end of paragraphs loop
	
	return p;
}

function createPostBodyHeader(commentBodyPart, containers) {
	containers = containers || [];

	var paragraph = createPostBodyParagraph(commentBodyPart, containers),
		childNodes = paragraph.childNodes,
	  	level = commentBodyPart.level,
	 	headerTag = 'h' + level,
	  	header = document.createElement(headerTag);
	
	for(let i = 0; i < childNodes.length; ++i){
		header.append(childNodes[i]);
	}
	  
	return header;
}

function createPostBodyPullQuote(commentBodyPart) {
	var alignment = commentBodyPart.alignment.toLowerCase(),
		pullquoteAside = document.createElement('aside'),
		pullquoteSpan = document.createElement('span');
	
	pullquoteAside.classList.add('pullquote','align--'+alignment);
	pullquoteSpan.classList.add('pullquote__content');

	for(let i = 0; i < commentBodyPart.value.length; ++i){
		pullquoteSpan.textContent += commentBodyPart.value[i].value;
	}

	pullquoteAside.appendChild(pullquoteSpan);
			
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
// 0.0.2.8 Changed to match new method of post body construction from 0.0.2.5
function mergeConsecutiveTags(postBodyArr, tag) {
	var newPostBodyArr = [],
		temp = document.createElement(tag);
	if(postBodyArr.length > 1){ 
		if(postBodyArr[0].nodeName == tag){
			temp.appendChild(postBodyArr[0].children[0]);
		}
		
		for(var i = 1; i <= postBodyArr.length; ++i){
			if(postBodyArr[i-1].nodeName == tag){
				if(postBodyArr[i] && postBodyArr[i].nodeName == tag){
					temp.appendChild(postBodyArr[i].children[0]);
				}else{
					if(temp.children.length){
						newPostBodyArr.push(temp);
						temp = document.createElement(tag);
					} else {
						newPostBodyArr.push(postBodyArr[i-1]);
					}
				} 
			}else {
				newPostBodyArr.push(postBodyArr[i-1]);
			}
		}
	} else {
		return postBodyArr;
	}
	
	return newPostBodyArr;

}
	
	
function createPostBodyImage(commentBodyPart) {
	var id = commentBodyPart.id,
		width = commentBodyPart.width,
		height = commentBodyPart.height,
		maxWidth = width + 'px',
		paddingBottom = calculatePaddingBottom(width, height) + '%',
		imgFormat = commentBodyPart.format.toLowerCase(),
		source = id + '.' + imgFormat,
		sourceSize = width + 'px',
		imgSrcBase = 'https://i.kinja-img.com/gawker-media/image/upload/c_scale,fl_progressive,q_80,w_636/',
		smallMediaSourceBase = 'https://i.kinja-img.com/gawker-media/image/upload/c_fit,fl_progressive,q_80,w_636/',
		smallMediaSource = smallMediaSourceBase + source;

	var marqueeFigureObj = { 'class': 'js_marquee-assetfigure align--center' }, 
		imgWrapperDivObj = { 'class': 'img-wrapper lazy-image ', style: 'max-width: '+maxWidth+';' },
		imgPermalinkSubWrapperDivObj = { 'class': 'img-permalink-sub-wrapper img-permalink-sub-wrapper--nobackground', style: 'padding-bottom: '+paddingBottom+'; ' },
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
		$lightboxWrapperSpan,
		$lightboxMagnifierSpan,
		zoomInIconSvgHTML,
		$picture,
		$source1, $source2, $source3,
		$img;

	zoomInIconSvgHTML = '<svg class="svg-icon svg-zoom-in">' + 
		'<use xmlns:xlink="http://www.w3.org/1999/xlink" ' + 
		'xlink:href="#iconset-zoom-in"></use></svg>';
	$lightboxMagnifierSpan = $('<span>', { 'class': 'magnifier js_lightbox lightbox' }).append(zoomInIconSvgHTML);
	$source1 = $('<source>', source1_obj);
	$source2 = $('<source>', source2_obj);
	$source3 = $('<source>', source3_obj);
	$img = $('<img>', imgObj);
						
	$picture = $('<picture>').append($source1, $source2, $source3, $img);
	$lightboxWrapperSpan = $('<span>', { 'class': 'js_lightbox-wrapper lightbox-wrapper' })
		.append($lightboxMagnifierSpan, $picture);
		
	$lightboxWrapperSpan.click(function() {
		// console.log('lightboxWrapperSpan click');
		var $lightboxOverlayDiv = createLightboxOverlayDiv(source);
		$('body').append($lightboxOverlayDiv);
	});
	
	$imgPermalinkSubWrapperDiv = $('<div>', imgPermalinkSubWrapperDivObj).append($lightboxWrapperSpan);
	$imgWrapperDiv = $('<div>', imgWrapperDivObj).append($imgPermalinkSubWrapperDiv);
	$marqueeFigure = $('<figure>', marqueeFigureObj).append($imgWrapperDiv);

	return $marqueeFigure;


	function calculatePaddingBottom(width, height) {
		var decimalVal = height / width,
			percent = decimalVal * 100;

		return round(percent, 1);


		function round(number, precision) {
			var factor = Math.pow(10, precision),
	    		tempNumber = number * factor,
	    		roundedTempNumber = Math.round(tempNumber);
	    
	    	return roundedTempNumber / factor;
		}
	}
}


function createLightboxOverlayDiv(imgSource) {
	var imgSourceBase = 'https://i.kinja-img.com/gawker-media/image/upload/',
		src = imgSourceBase + imgSource,
		lightboxOverlayDiv,
		lightboxContainerDiv,
		closeLightboxAnchor,
		img,
		//closeIconSvgHTML = '<svg class="svg-icon svg-close">' +
			// '<svg class="svg-icon svg-close" xmlns:xlink="http://www.w3.org/1999/xlink" ' + 
			// 'xmlns="http://www.w3.org/2000/svg"><use xlink:href="#iconset-close"></use></svg>',
		// svgIconTempContainer = document.createElement('div'),
		closeIconSvg = document.getElementsByClassName('svg-icon');
	
	if(closeIconSvg.length){
		closeIconSvg = closeIconSvg[0].cloneNode(true);
		closeIconSvg.classList.value = "svg-icon svg-close";
		closeIconSvg.firstChild.attributes['xlink:href'] = '#iconset-close';
		closeIconSvg.firstChild.attributes[0].nodeValue = '#iconset-close';
	}else{
		closeIconSvg = createElement('span', {'style':'color: white; font-size:2em;'}, 'x');
	}
		
	img = document.createElement('img'); 
	img.className = 'kinjamprove-post-body-image';
	img.src = src;

	closeLightboxAnchor = document.createElement('a');
	closeLightboxAnchor.className = 'close js_close icon--svg svg-icon--white u-giant u-full--onhover';
	closeLightboxAnchor.appendChild(closeIconSvg)
	closeLightboxAnchor.appendChild(img);
	
	lightboxContainerDiv = document.createElement('div');
	lightboxContainerDiv.className = 'lightbox-container';
	lightboxContainerDiv.appendChild(closeLightboxAnchor);

	lightboxOverlayDiv = document.createElement('div');
	lightboxOverlayDiv.className = 'lightbox-overlay';
	lightboxOverlayDiv.appendChild(lightboxContainerDiv);

	return lightboxOverlayDiv;
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
			src: '/ajax/inset/iframe?id=youtube-video-'+id, 
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
			frameborder: 0, 
			allowfullscreen: true, 
			src: '/ajax/inset/iframe?id=twitter-'+id+'&autosize=1', 
			width: 640, 
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
	var replySidebarLikeElem = createReplySidebarLikeElem(comment.likes),
		replySidebarObj = { 
			'class': 'reply__sidebar' 
		},
		replySidebar = createElement('div', replySidebarObj),
		likedByUser = comment.likedByUser;

	replySidebar.appendChild(replySidebarLikeElem);

	return replySidebar;

	function createReplySidebarLikeElem(likeCount) {
		var replySidebarStarSvg = document.getElementsByClassName('svg-icon'),
			replySidebarLikeCountSpanObj = { 
				'class': 'like-count js_like_count' 
			},
			replySidebarLikeCountText = likeCount ? likeCount : '',
			replySidebarLikeCountSpan = createElement('span', replySidebarLikeCountSpanObj, replySidebarLikeCountText),
			likeElemClass = 'js_like reply__recommend readonly-hide icon--svg u-undecorated u-darkened--onhover js_like_icon';
			
		if(likedByUser){
			likeElemClass += ' active';
		}
		
		var replySidebarLikeObj = { 
				'class': likeElemClass, 
				title: 'Recommend' 
			},
			replySidebarLikeElem = createElement('a', replySidebarLikeObj);
		
		if(replySidebarStarSvg.length){
			replySidebarStarSvg = replySidebarStarSvg[0].cloneNode(true);
			replySidebarStarSvg.classList.value = "svg-icon giant stroked svg-star--giant";
			replySidebarStarSvg.firstChild.attributes['xlink:href'] = '#iconset-star--giant';
			replySidebarStarSvg.firstChild.attributes[0].nodeValue = '#iconset-star--giant';
		} else{
			replySidebarStarSvg = document.createTextNode('*');
		}
		
		appendNodesToElement(replySidebarLikeElem, [ replySidebarStarSvg, replySidebarLikeCountSpan ]);

		if (kinjamprove.userLikedPostIdsMap.has(comment.id)) {
			replySidebarLikeElem.classList.add('active');
		}
		
		
		return replySidebarLikeElem;
	}
}

function likeCommentOnClick(event) {
	event.preventDefault();
    event.stopPropagation();
	if(!kinjamprove.loggedIn){
		mustBeLoggedIn();
		return;
	}
	var $this = $(this),
		$comment = $this.closest('article');

	if ($this.hasClass('active')) {
		unlikeComment($comment, $this);
	} else {
		likeComment($comment, $this);
	}
	
}

function likeComment($comment, $likeDiv) {
	var postId = $comment.attr('data-id'),
		$likeCount = $likeDiv.find('.like-count'),
		currentLikeCountText = $likeCount.text(),
		currentLikeCount = (currentLikeCountText.length) ? Number.parseInt(currentLikeCountText) : 0,
		token = Utilities.getKinjaToken(),
		origin = window.location.origin,
		likeUrl = origin + '/ajax/post/' + postId + '/likeAndApprove',
		payload = { postId: postId},
		payloadStr = JSON.stringify(payload),
		xhr = new XMLHttpRequest(),
		starterId = $comment.closest('section.discussion-region').attr('starter-id'),
		commentTracker = kinjamprove.commentTrackers[starterId];

	xhr.open('POST', likeUrl, true);
	xhr.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
	xhr.setRequestHeader('Authorization', 'Bearer '+token);
	xhr.onload = function() {
		console.log(this);
		$likeDiv.addClass('active');
		++currentLikeCount;
		$likeCount.text(currentLikeCount);
		var response = JSON.parse(this.responseText),
			repliesToAdd = {n: 0, a: 0, s: 0, p: 0, type: 0};
		
		$comment.addClass('kinjamprove-liked-by-user');
		postId = parseInt(postId);
		let comment = commentTracker.commentsMap.get(postId),
			parentComment = commentTracker.commentsMap.get(comment.parentId),
			baseComment = commentTracker.commentsMap.get(comment.threadId),
			threadCount = commentTracker.commentsPerThread.get(comment.threadId),
			threadTypes = commentTracker.threadTypes;
		
		commentTracker.subtractFromVisibleCount(commentTracker.totalVisible, threadCount);
		++threadCount.liked;
		// Update liked status and count.
		comment.likedByUser = true;
		comment.articleClass += ' kinjamprove-liked-by-user';
		comment.likes = comment.likes ? comment.likes + 1 : 1;
		if(comment.maxThreadLikes < comment.likes){
			comment.maxThreadLikes = comment.likes;
			comment.updateThreadForLikes(commentTracker, true);
		}
		// Update approved/staff status.
		if(!comment.approved){
			// userIsAuthor => userIsStaff
			if(commentTracker.userIsStaff){
				comment.approved = true;
			} else if (response.data.approvalResult.approvedReplies && response.data.approvalResult.approvedReplies.length){
				for(let i = 0; i < response.data.approvalResult.approvedReplies.length && !comment.approved; ++i){
					if(response.data.approvalResult.approvedReplies[i].postId == postId){
						comment.approved = true;
					}
				}
			}
			if(commentTracker.userIsAuthor){
				++repliesToAdd.type;
				repliesToAdd.s = 1;
				comment.staffCuratedReply = true;
				commentTracker.threadTypes.staff.set(comment.threadId, baseComment);
				commentTracker.staffCommentIdsMap.set(comment.id, 1);
				if(parentComment && parentComment.staffCuratedReply){
					++parentComment.directStaffReplyCount;
				}
			}
			if(comment.approved){
				commentTracker.approvedCommentIds.push(comment.id);

				--commentTracker.totalVisible.pending;
				++commentTracker.totalVisible.approved;
				commentTracker.pendingCommentIds = 
					commentTracker.pendingCommentIds.filter(function(value){
						if(value == comment.id){
							return false;
						}else{
							return true;
						}
					});
				++repliesToAdd.type;
				repliesToAdd.a = 1;
				if(parentComment && parentComment.approved){
					++parentComment.directApprovedReplyCount;
				}
			}
		}
		if(!comment.staffCuratedReply && commentTracker.userIsAuthor){
			++repliesToAdd.type;
			repliesToAdd.s = 1;
			comment.staffCuratedReply = true;
			commentTracker.threadTypes.staff.set(comment.threadId, baseComment);
			commentTracker.staffCommentIdsMap.set(comment.id, 1);
			if(parentComment && parentComment.staffCuratedReply){
				++parentComment.directStaffReplyCount;
			}
		}
		if(repliesToAdd.type){
			comment.updateThreadForNewComment(commentTracker, repliesToAdd);
		}
		
		threadCount.pending += repliesToAdd.p;
		threadCount.approved += repliesToAdd.a;
		threadCount.staff += repliesToAdd.s;
		commentTracker.addToVisibleCount(commentTracker.totalVisible, threadCount);

		commentTracker.threadTypes.liked.set(comment.threadId, baseComment);
		commentTracker.userLikedCommentIds.push(postId);
		kinjamprove.userLikedPostIdsMap.set(postId, 1);
		commentTracker.updateFilterSelect("liked");
		if(parentComment){
			let $parentPost = commentTracker.commentArticles[parentComment.id];
			if($parentPost){
				commentTracker.userUnhiddenArticleMap.set(comment.id, [$parentPost, 'li[data-id="'+comment.id+'"]']);	
			}
		}
	};
	
	xhr.onerror = function(){
		console.log('Kinjamprove: Error liking comment', this);
		alert('Kinjamprove: Error liking comment. If this problem persists, please contact developer.');
	};
	
	xhr.send(payloadStr);
}

function unlikeComment($comment, $likeDiv) {
	var postId = $comment.attr('data-id'),
		token = Utilities.getKinjaToken(),
		origin = window.location.origin,
		unlikeUrl = origin + '/api/likes/unlike/post',
		payload = { postId: postId},
		payloadStr = JSON.stringify(payload),
		xhr = new XMLHttpRequest(),
		starterId = $comment.closest('section.discussion-region').attr('starter-id'),
		commentTracker = kinjamprove.commentTrackers[starterId],
		$likeCount = $likeDiv.find('.like-count'),
		currentLikeCountText = $likeCount.text(),
		currentLikeCount = (currentLikeCountText.length) ? Number.parseInt(currentLikeCountText) : 0;

	xhr.open('POST', unlikeUrl, true);
	xhr.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
	xhr.setRequestHeader('Authorization', 'Bearer '+token);
	xhr.onload = function() {
		
		$likeDiv.removeClass('active');
		currentLikeCount = Math.max(0, currentLikeCount - 1);
		currentLikeCountText = currentLikeCount || '';
		$likeCount.text(currentLikeCountText);
		
		postId = Number.parseInt(postId);
		$comment.removeClass('kinjamprove-liked-by-user');
		
		var comment = commentTracker.commentsMap.get(postId),
			baseComment = commentTracker.commentsMap.get(comment.threadId),
			threadCount = commentTracker.commentsPerThread.get(comment.threadId),
			threadTypes = commentTracker.threadTypes;
		
		--threadCount.liked;
		--commentTracker.totalVisible.liked;
		
		comment.likes = comment.likes ? comment.likes - 1 : 0;
		if(comment.maxThreadLikes == comment.likes + 1){
			comment.updateThreadForLikes(commentTracker, false);
		}
		
		comment.likedByUser = false;

		if(!threadCount.liked){
			commentTracker.threadTypes.liked.delete(comment.threadId);
		}
		
		commentTracker.userLikedCommentIds = 
			commentTracker.userLikedCommentIds.filter(function(value){
				if(value == postId){
					return false;
				}else{
					return true;
				}
			});

		kinjamprove.userLikedPostIdsMap.delete(postId);
		
		commentTracker.updateFilterSelect("unliked");
	};
	
	xhr.onerror = function(){
		console.log('Kinjamprove: Error unliking comment', this);
		alert('Kinjamprove: Error unliking comment. If this problem persists, please contact developer.');
	};
	
	xhr.send(payloadStr);
}

function createReplyDiv(divObj, linkArr, nodeText) {
	var $replyDiv = document.createElement('div'),
		$replyLink,
		replyLinkTextNode;
		
	for (var prop in divObj) {
		$replyDiv.setAttribute(prop, divObj[prop]);
	}

	for (var i = 0; i < linkArr.length; ++i){
		$replyLink = document.createElement('a');
		for (var prop in linkArr[i]) {
			$replyLink.setAttribute(prop, linkArr[i][prop]);
		}
		replyLinkTextNode = document.createTextNode(nodeText[i]);
		$replyLink.appendChild(replyLinkTextNode);
		$replyDiv.appendChild($replyLink);
	}
	
	
	return $replyDiv;	
}


function createKinjamproveSpinnerBounce() {
	var kinjamproveSpinnerBounce = createElement('span', { 'class': 'spinner bounce' }),
		tempArr = [ 'one', 'two', 'three' ];

	for (var i = 0; i < tempArr.length; i++) {
		var bounceNum = tempArr[i],
			bounce = createElement('span', { 'class': bounceNum+' kinjamprove-spinner-bounce' });
		kinjamproveSpinnerBounce.appendChild(bounce);
	}

	return kinjamproveSpinnerBounce;
}	


function createReplyToStoryButton() {
    var $replyToStoryContainerDiv,
        $replyToStoryButton,
        replyToStoryIconSpanHTML = '<span class="icon--svg u-prepended"><svg class="svg-icon svg-bubble-plus"><use xlink:href="#iconset-bubble-plus"></use></svg></span>';
    
    $replyToStoryButton = $('<button>', { 
		'data-reactroot': '', 
		'class': 'button button--tertiary small kinjamprove-reply-to-story-button' 
    }).append(replyToStoryIconSpanHTML, 'Kinjamprove Reply');
    
    $replyToStoryContainerDiv = $('<div>', { 'class': 'reply-to-post__container js_reply-button-container hide-for-small kinjamprove-reply-to-story-button-container' }).append($replyToStoryButton);
    
    return $replyToStoryContainerDiv;
}


function onKinjamprovePublishButtonClick() { 
	var $this = $(this),
		$commentEditorPlaceholder = $this.closest('.js_editor-placeholder[depth]'),
		$parentComment = $commentEditorPlaceholder.siblings('article'),
		parentCommentId = $parentComment.attr('data-id'),
		$textEditor = $('.scribe.editor-inner');

	// console.log('onKinjamprovePublishButtonClick: $this:', $this, '$parentComment:', $parentComment, 'parentCommentId:', parentCommentId);
 
	var payload = { 
		body: renderPostBodyFromTextEditor($textEditor), 
		defaultBlogId: window.localStorage.kinjamprove_defaultBlogId,
		images: [],
		original: $('textarea:hidden').val(),
		parentId: parentCommentId,
		token: window.localStorage.kinjamprove_kinjaToken
	};
	
	// console.log('payload: ', payload);
	
// 	/* For debugging so that post doesn't actually get created */
// 	if (true) {		
// 		return;
// 	}
	setTimeout(function() {
		var publishReply = confirm('Are you sure you want to publish this reply?');
			
		
		if (publishReply) {
			createComment(payload.body, payload.defaultBlogId, payload.images, 
							  payload.original, payload.parentId, payload.token, false);
			

			$commentEditorPlaceholder.children().remove();
		}
	}, 0);		
}
