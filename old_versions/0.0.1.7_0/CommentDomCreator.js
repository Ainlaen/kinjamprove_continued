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
	var depth = isNaN(Number.parseInt(comment.depth)) ? 0 : comment.depth,
		listItemClassArr = [
			'commentlist-item',
			'commentlist__item',
			'commentlist__item--depth-'+depth,
			'commentlist__item--expandable',
			comment.approved ? '' : 'kinjamprove-unapproved'
		],
		// listItemClass = 'commentlist__item commentlist__item--depth-' + depth + ' commentlist__item--expandable',
		listItemClass = listItemClassArr.join(' ').trim(),
		listItemObj = { 
			'class': listItemClass,
			'data-authorid': comment.authorId
		};

	// if (!comment.approved) {
	// 	listItemObj['class'] += ' kinjamprove-unapproved';
	// }

	var $commentArticle = createCommentArticle(comment),
		$regionWarning = $('<div>', { 'class': 'js_region--warning' }),
		$editorPlaceholder = $('<div>', { 'class': 'js_editor-placeholder', depth: depth }),
		$listItem = $('<li>', listItemObj).append($commentArticle, $regionWarning, $editorPlaceholder);
		
	// if (!comment.approved) {
	// 	$listItem.addClass('kinjamprove-unapproved');
	// }
	
	return $listItem;
}

function createCommentArticle(comment) {
	var blockedUsers = (kinjamprove && kinjamprove.options && kinjamprove.options.blockedUsers)
		 ? JSON.parse(kinjamprove.options.blockedUsers) 
		 : { };

	 if (!blockedUsers) {
	 	blockedUsers = { };
	 }
	// var kinjamprove = kinjamprove 
	// 	? kinjamprove 
	// 	: { 
	// 		followingAuthor: function(authorId) { 
	// 			return false;
	// 		 },
	// 		 userFlaggedPostIdsMap: { }
		// };
	
	if (!comment.author) {
		comment.author = { 
			displayName: '',
			screenName: '', 
			avatar: { 
				id: '17jcxp06aqnkmpng',
				format: 'png'
			}
		}
	} else if (!comment.author.avatar) {
		comment.author.avatar = {
			id: '17jcxp06aqnkmpng',
			format: 'png'
		};
	}	

	comment.author.displayName = comment.author.displayName || '';

	if (!comment.author.displayName.length) {
		var authorBlogId = comment.authorBlogId,
			blogs = comment.blogs;
		for (var i = 0; i < blogs.length; i++) {
			if (blogs[i].id === authorBlogId) {
				comment.author.displayName = blogs[i].displayName.length 
					? blogs[i].displayName 
					: blogs[i].name; 
				break;
			}
		}
	}

	comment.author.screenName = comment.author.screenName || '';
	
	var articleClass = 'reply js_reply',
		articleObj = { 
			id: 'reply_'+comment.id,
			'class': articleClass, 
			'data-id': comment.id, 
			'data-parentid': comment.parentId, 
			'data-authorname': comment.author.screenName.toLowerCase(),
			'data-authorId': comment.authorId,
			 depth: comment.depth
			 ,
			 'data-newest': comment.newest
			 , 'data-maxthreadlikes': comment.maxThreadLikes
		},
		$article,
		commentAnchorHTML = '<a id="comment-' + comment.id + '" class="comment-anchor"></a>',
		$header = createCommentHeader(comment),
		$replyContent,
		$replySidebar, 
		$replyToolsDiv,
		$flaggedIndicator;
		
	if (!comment.approved) {
		articleObj['class'] += ' reply--unapproved kinjamprove-unapproved';
	}
	
	if (Utilities.userIsCommentAuthor(comment)) {
		articleObj['class'] += ' kinjamprove-user-comment';
		if(Utilities.commentIsEditableByUser(comment)){
			articleObj['class'] += ' kinjamprove-user-comment-editable';
		}
	}

	if (kinjamprove.followingAuthor(comment.authorId)) {
		articleObj['class'] += ' kinjamprove-followedUser';
	}
	
	if (comment.authorIsStaff) {
		articleObj['class'] += ' kinjamprove-staff';
	}
	
	if (comment.curatedReply) {
		articleObj['class'] += ' kinjamprove-curated';
		articleObj.directReplyCount = comment.directReplyCount;
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
	$replyToolsDiv = createReplyToolsDiv(comment);
	$flaggedIndicator = $('<div>', { 'class': 'js_reply-flagged reply__flagged-indicator' }).text('Flagged');
	
	if (kinjamprove.userFlaggedPostIdsMap.hasOwnProperty(comment.id)) {
		$flaggedIndicator.css('display', 'inline');
	}
			

	$article = $('<article>', articleObj)
		.append(commentAnchorHTML, $header, $replyContent, 
				$replySidebar, $replyToolsDiv, $flaggedIndicator);

	return $article;
}

function createCommentArticle2(comment) {
	var blockedUsers = kinjamprove ? JSON.parse(kinjamprove.options.blockedUsers) : { };
	// var kinjamprove = kinjamprove 
	// 	? kinjamprove 
	// 	: { 
	// 		followingAuthor: function(authorId) { 
	// 			return false;
	// 		 },
	// 		 userFlaggedPostIdsMap: { }
	// 	};
	
	if (!comment.author) {
		comment.author = { 
			displayName: '',
			screenName: '', 
			avatar: { 
				id: '',
				format: ''
			}
		}
	}
	
	var articleClass = 'reply js_reply',
		articleObj = { 
			id: 'reply_'+comment.id,
			'class': articleClass, 
			'data-id': comment.id, 
			'data-parentid': comment.parentId, 
			'data-authorname': comment.author.screenName.toLowerCase(),
			'data-authorId': comment.authorId,
			 depth: comment.depth 
		},
		article,// = document.createElement('article'),
		commentAnchor = document.createElement('a');
		$header = createCommentHeader(comment),
		$replyContent,
		$replySidebar, 
		$replyToolsDiv,
		$flaggedIndicator;

	
	commentAnchor.className = 'comment-anchor';
	commentAnchor.id = 'comment-' + comment.id;
		
	if (!comment.approved) {
		articleObj['class'] += ' reply--unapproved kinjamprove-unapproved';
	}
	
	if (Utilities.userIsCommentAuthor(comment)) {
		articleObj['class'] += ' kinjamprove-user-comment';
	}

	if (kinjamprove.followingAuthor(comment.authorId)) {
		articleObj['class'] += ' kinjamprove-followedUser';
	}
	
	if (comment.authorIsStaff) {
		articleObj['class'] += ' kinjamprove-staff';
	}

	for (var prop in articleObj) {
		article.setAttribute(prop, articleObj[prop]);
	}
				
	if (blockedUsers.hasOwnProperty(comment.authorId)) {		
		articleObj['class'] += ' kinjamprove-blockedUser';

		
		var $replyByline = $header.children('.reply__byline'),
			blockedUserContainerHtml = '<div class="blockedUserMessage">This user is blocked with Kinjamprove.</div>';
		
		$header.nextAll().remove();
		$replyByline.empty().nextAll().remove();
		$replyByline.append(blockedUserContainerHtml).after(createCollapseThreadButton());
		
		
		$header.find('.avatar img').attr('src', chrome.runtime.getURL('icons/kinjamprove_blocked_user_avatar.png'));
		// $article = $('<article>', articleObj).append(commentAnchorHTML, $header);
		
		$article.appendChild(commentAnchor);
		$article.appendChild($header[0]);

		return $article;
	}
	
		
	replyContentDiv = createReplyContentDiv(comment);
	$replySidebar = createReplySidebar(comment); 
	$replyToolsDiv = createReplyToolsDiv(comment);
	// $flaggedIndicator = $('<div>', { 'class': 'js_reply-flagged reply__flagged-indicator' }).text('Flagged');

	$flaggedIndicator = document.createElement('div');
	$flaggedIndicator.className = 'js_reply-flagged reply__flagged-indicator';
	$flaggedIndicator.appendChild(document.createTextNode('Flagged'));

	
	if (kinjamprove.userFlaggedPostIdsMap.hasOwnProperty(comment.id)) {
		$flaggedIndicator.style.display = 'inline';
	}
			

	var childNodesArr = [ 
			commentAnchor, 
			$header, 
			replyContentDiv, 
			$replySidebar, 
			$replyToolsDiv, 
			$flaggedIndicator
		];

	for (var i = 0; i < childNodesArr.length; i++) {
		var childNode = childNodesArr[i][0] ? childNodesArr[i][0] : childNodesArr[i];

		$article.appendChild(childNode);
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
			.text('Pending Approval');
		$replyByline.before($pendingApprovalSpan);
	}			

	return $header;
}

function createAvatarContainer(comment) {
	const IMG_SRC_BASE = 'https://i.kinja-img.com/gawker-media/image/upload/c_fill,fl_progressive,g_center,h_80,q_80,w_80/',
		  AVATAR_CONTAINER_CLASS = 'avatar avatar-container js_avatar-container',
		  AVATAR_ICON_SVG_HTML = '<span class="icon--svg"><svg class="svg-icon small svg-checkmark--small"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#iconset-checkmark--small"></use></svg></span>',
		  AVATAR_HREF_BASE = '//kinja.com/';
	
	var imgSrc = IMG_SRC_BASE + comment.author.avatar.id + '.' + comment.author.avatar.format,
		avatarImg = createElement('img', { src: imgSrc }),
		avatarHideSpan = createElement('span', { 'class': 'avatar-default hide' }),
		avatarHref =  AVATAR_HREF_BASE + comment.author.screenName,
		avatarContainerObj = { 
			href: avatarHref, 
			'class': AVATAR_CONTAINER_CLASS 
		},
		checkmarkSvgIcon = getNodeFromHTML(AVATAR_ICON_SVG_HTML),
		avatarContainer = createElement('a', avatarContainerObj);

	appendNodesToElement(avatarContainer, [ checkmarkSvgIcon, avatarImg, avatarHideSpan ]);

	return avatarContainer;
}

function createReplyPublishTimeDiv(comment) {
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
		replyPublishTimeDivObj =  { 'class': 'reply__publish-time' },
		replyPublishTimeLinkSpan = createElement('span', replyPublishTimeLinkSpanObj, replyPublishTimeLinkSpanText), 
		replyPublishTimeLink = createElement('a', replyPublishTimeLinkObj), 
		replyPublishTimeDiv = createElement('div', { 'class':  'reply__publish-time' }); 
		
	
	replyPublishTimeLink.appendChild(replyPublishTimeLinkSpan);
	replyPublishTimeDiv.appendChild(replyPublishTimeLink);
	replyPublishTimeDiv.className = 'reply__publish-time';

	// var newestText = ' (newest: ' + Utilities.publishTimeFormatter(comment.newest) + ')';
	// var newestSpan = createElement('span', { 'class': 'kinjamprove-newest' }, newestText);
	// replyPublishTimeDiv.appendChild(newestSpan);

	// $replyPublishTimeDiv.append('<span class="kinjamprove-newest"> (newest: '+publishTimeFormatter(comment.newest)+')</span>');

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
		$replyBylineAuthorName = $('<a>', replyBylineAuthorNameObj).text(replyBylineAuthorNameText);
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
		var authorDisplayName = comment.author.displayName,
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
			'class': 'parent-comment-link', 
			href: '#comment-'+comment.parentId
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
		dropdownLinkIconOuterHTML = createSvgIconHtml('tools--giant'),
		dropdownSvgIcon = getNodeFromHTML(dropdownLinkIconOuterHTML),
		postDropdownLink = createElement('a', postDropdownLinkObj), 
		collapseThreadButton = createCollapseThreadButton(),
		postDropdownUl = createPostDropdownUl(comment),
		postDropdownDiv = createElement('div', postDropdownDivObj); 
			

	postDropdownLink.appendChild(dropdownSvgIcon);
	appendNodesToElement(postDropdownDiv, [ collapseThreadButton, postDropdownUl, postDropdownLink ]);
		
	return postDropdownDiv;
}




function $createReplyContentDiv(comment) {
	var postBody = createPostBody(comment),
		replyContentDivClass = 'reply__content js_reply-content post-content blurable whitelisted-links',
		$replyContentDiv = $('<div>', { 'class': replyContentDivClass }).append(...postBody);
	
	return $replyContentDiv;
}

function createReplyContentDiv(comment) {
	var postBody = createPostBody(comment),
		replyContentDivObj = { 
			'class': 'reply__content js_reply-content post-content blurable whitelisted-links' 
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
				for (var j = 0; j < bodyPartValue.value.length; j++) {
					textValue += bodyPartValue.value[j].value;
				}
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
			'<span class="pullquote__content">' + commentBodyPart.value[0].value +
			'</span></aside>';
			
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
		console.log('lightboxWrapperSpan click');
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
		closeIconSvgHTML = '<svg class="svg-icon svg-close">' +
			'<svg class="svg-icon svg-close" xmlns:xlink="http://www.w3.org/1999/xlink" ' + 
			'xmlns="http://www.w3.org/2000/svg"><use xlink:href="#iconset-close"></use></svg>',
		// svgIconTempContainer = document.createElement('div'),
		closeIconSvg = getNodeFromHTML(closeIconSvgHTML);
		
	// svgIconTempContainer.innerHTML = closeIconSvgHTML;
	// closeIconSvg = svgIconTempContainer.childNodes[0];
		
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
		replySidebar = createElement('div', replySidebarObj);

	replySidebar.appendChild(replySidebarLikeElem);

	return replySidebar;

	function createReplySidebarLikeElem(likeCount) {
		var replySidebarStarSvg = getNodeFromHTML(createSvgIconHtml('star--giant')),
			replySidebarLikeCountSpanObj = { 
				'class': 'like-count js_like_count' 
			},
			replySidebarLikeCountText = likeCount ? likeCount : '',
			replySidebarLikeCountSpan = createElement('span', replySidebarLikeCountSpanObj, replySidebarLikeCountText),
			likeElemClass = 'js_like reply__recommend readonly-hide icon--svg u-undecorated u-darkened--onhover js_like_icon',
			replySidebarLikeObj = { 
				'class': likeElemClass, 
				title: 'Recommend' 
			},
			replySidebarLikeElem = createElement('a', replySidebarLikeObj);
		
		replySidebarStarSvg.classList.add('stroked', 'giant');
		appendNodesToElement(replySidebarLikeElem, [ replySidebarStarSvg, replySidebarLikeCountSpan ]);

		if (kinjamprove.userLikedPostIdsMap.hasOwnProperty(comment.id)) {
			replySidebarLikeElem.classList.add('active');
		}
		
		
		return replySidebarLikeElem;
	}
}

function likeCommentOnClick() {
	var $this = $(this),
		$comment = $this.closest('article'),
		$likeCount = $this.find('.like-count'),
		currentLikeCountText = $likeCount.text(),
		currentLikeCount = (currentLikeCountText.length) ? Number.parseInt(currentLikeCountText) : 0,
		newLikeCount = 0,
		newLikeCountText = '';

	if ($this.hasClass('active')) {
		unlikeComment($comment);
		$this.removeClass('active');
		newLikeCount = Math.max(0, currentLikeCount - 1);//(currentLikeCount > 0) ? currentLikeCount - 1 : 0;
	} else {
		likeComment($comment);
		$this.addClass('active');	
		newLikeCount = currentLikeCount + 1;
	}
	
	newLikeCountText = newLikeCount ? newLikeCount : '';
	console.log('newLikeCount="' + newLikeCount + '"');
	
	$likeCount.text(newLikeCountText);
}

function likeComment($comment) {
	var postId = $comment.attr('data-id'),
		token = Utilities.getKinjaToken(),
		origin = window.location.origin,
		likeUrl = origin + '/ajax/post/' + postId + '/likeAndApprove?token=' + token,
		payload = { postId: postId },
		payloadStr = JSON.stringify(payload),
		xhr = new XMLHttpRequest();

	xhr.open('POST', likeUrl, true);
	xhr.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
	xhr.onload = function() {
		console.log(this);
		console.log(JSON.parse(this.responseText));
		
		kinjamprove.userLikedPostIdsMap[postId] = 1;
	};
	xhr.send(payloadStr);
}

function unlikeComment($comment) {
	var postId = $comment.attr('data-id'),
		token = Utilities.getKinjaToken(),
		origin = window.location.origin,
		unlikeUrl = origin + '/api/likes/unlike/post',
		payload = { postId: postId, token: token },
		payloadStr = JSON.stringify(payload),
		xhr = new XMLHttpRequest();

	xhr.open('POST', unlikeUrl, true);
	xhr.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
	xhr.onload = function() {
		console.log(this);
		console.log(JSON.parse(this.responseText));
		
		postId = Number.parseInt(postId);
		
		if (kinjamprove.userLikedPostIdsMap.hasOwnProperty(postId)) {
			delete kinjamprove.userLikedPostIdsMap[postId];
		}
	};
	xhr.send(payloadStr);
}

function createReplyToolsDiv(comment) {
	var replyToolsDivObj = {
			'class': 'reply__tools js_reply-tools',
			'data-analytics-target': 'groupChat'
		},
		replyToolsLinkObj = {
			'class': 'js_reply-to-selected-post reply__link readonly-hide',
			'data-id': comment.id,
			rel: 'nofollow',
			title: 'Reply',
		},
		$replyToolsDiv = document.createElement('div'),
		$replyToolsLink = document.createElement('a'),
		replyToolsLinkTextNode = document.createTextNode('Reply');
		
	for (var prop in replyToolsDivObj) {
		$replyToolsDiv.setAttribute(prop, replyToolsDivObj[prop]);
	}
	for (var prop in replyToolsLinkObj) {
		$replyToolsLink.setAttribute(prop, replyToolsLinkObj[prop]);
	}

	$replyToolsLink.appendChild(replyToolsLinkTextNode);
	$replyToolsDiv.appendChild($replyToolsLink);
	
	return $replyToolsDiv;
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

	console.log('onKinjamprovePublishButtonClick: $this:', $this, '$parentComment:', $parentComment, 'parentCommentId:', parentCommentId);
 
	var payload = { 
		body: renderPostBodyFromTextEditor($textEditor), 
		defaultBlogId: window.localStorage.kinjamprove_defaultBlogId,
		images: [],
		original: $('textarea:hidden').val(),
		parentId: parentCommentId,
		token: window.localStorage.kinjamprove_kinjaToken
	};
	
	console.log('payload: ', payload);
	
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
