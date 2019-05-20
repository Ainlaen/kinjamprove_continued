function createPostDropdownUl(comment) {
	var id = 'dropdown-' + comment.id,
		postDropdownUlClassList = [
			'f-dropdown',
			// 'proxima',
			// 'js_post-dropdown',
			// 'js_follow-controls',
			// 'js_user-follow-controls',
			// 'whitelisted-links',
			'kinjamprove-comment-dropdown'
		],
		postDropdownUlClass = postDropdownUlClassList.join(' '),
		dataStarterId = comment.permalink.substring(comment.permalink.lastIndexOf('/')+1),
		postDropdownUlObj = { 
			id: id, 
			'class': postDropdownUlClass,
			'data-postid': comment.id,
			'data-starterid': dataStarterId,
			'data-authorid': comment.authorId, 
			'data-blogid': comment.authorBlogId,
			'data-sourceblogid': comment.sourceBlogId,
			'data-dropdown-content': '',
			'aria-hidden': true 
		},
		$postDropdownUl,
		$editCommentLi = createDropdownEditCommentLi(comment),
		$deleteCommentLi = createDropdownDeleteCommentLi(comment),
		$followLi = createDropdownFollowLi(comment),
		$unfollowLi = createDropdownUnfollowLi(comment),
		$flagLi = createDropdownFlagLi(comment),
		$unflagLi = createDropdownUnflagLi(comment),
		$dismissLi = createDismissDropdownLi(comment),
		$blockUserLi = createDropdownBlockUserLi(comment),
		$saveCommentIdLi = createDropdownSaveCommentLi(comment),
		$deleteCommentIdLi = createDropdownDeleteCommentIdLi(comment),
		$listItems = [
			$editCommentLi, 
			$deleteCommentLi, 
			$followLi, 
			$unfollowLi, 
			$flagLi, 
			$unflagLi, 
			$dismissLi, 
			$blockUserLi,
			$saveCommentIdLi,
			$deleteCommentIdLi
		],
		starterId = comment.starterId,
		userIsStaff = kinjamprove.commentTrackers[starterId].userIsStaff;
	
	if (Utilities.userIsCommentAuthor(comment)) {
		$blockUserLi.addClass('hide');
		let timeLeft = Utilities.commentPublishedInLastFifteenMinutes(comment);
		if (timeLeft > 0) {
			$editCommentLi.removeClass('hide');
			// 0.0.1.8 Time out editing
			setTimeout(function() {
				$editCommentLi.addClass('hide').hide();
				$editCommentLi.closest('article')
					.removeClass('kinjamprove-user-comment-editable')
					.removeAttr('title');
			}
			,timeLeft);
		}
	}
	
	if (!Utilities.commentIsDeletableByUser(comment)) {
		$deleteCommentLi.addClass('hide');
	}
	
	if(userIsStaff && !comment.authorIsStaff){
		var $followForBlogLi = createDropdownFollowForBlogLi(comment),
			$unfollowForBlogLi = createDropdownUnfollowForBlogLi(comment),
			$blockUserForBlogLi = createDropdownBlockUserForBlogLi(comment);
		
		$listItems.push($followForBlogLi);
		$listItems.push($unfollowForBlogLi);
		$listItems.push($blockUserForBlogLi);
	}
	
	if (Utilities.userFlaggedPost(comment.id)) {
		$flagLi.addClass('hide');
		$unflagLi.removeClass('hide');
	}
	
	if(kinjamprove.options.saved_comment_ids[comment.id]){
		$saveCommentIdLi.addClass('hide');
		$deleteCommentIdLi.removeClass('hide');
	}
	
	$postDropdownUl = $('<ul>', postDropdownUlObj)
		.prepend($listItems);
	
	return $postDropdownUl;
}

function createSvgIconHtml(iconName) {
	var svgIconInnerHtml = '<use xlink:href="#iconset-' + iconName + '"></use>',
		svgIconOuterHtml = '<svg class="svg-icon svg-' + iconName + '">' + 
			svgIconInnerHtml + '</svg>';
		
	return svgIconOuterHtml;
}


function createDropdownEditCommentLi(comment) {
	var $editCommentLi, 
		$editCommentLink,
		editCommentLinkSvgHtml = createSvgIconHtml('write'),
		editCommentLinkText = 'Edit',
		editCommentLinkObj = { 
			'class': 'icon--svg u-darkened--onhover u-prepended', 
			rel: 'nofollow' 
		},
		editCommentLiObj = { 
			'class': 'js_edit-reply hover-icon readonly-hide kinjamprove-edit-comment hide' 
		};

	$editCommentLink = $('<a>', editCommentLinkObj)
		.append(editCommentLinkSvgHtml, editCommentLinkText);

	$editCommentLi = $('<li>', editCommentLiObj)
		.append($editCommentLink);

	return $editCommentLi;
}

function createDropdownDeleteCommentLi(comment) {
	var $deleteCommentLi,
		$deleteCommentLink,
		deleteCommentSvgIconHTML = createSvgIconHtml('close'),
		deleteCommentLinkText = 'Delete',
		deleteCommentLiObj = {
			'class': 'js_delete-reply hover-icon readonly-hide kinjamprove-delete-comment',
			'data-blogid': comment.defaultBlogId,
			'data-postid': comment.id
		},
		deleteCommentLinkObj = { 
			'class': 'icon--svg u-darkened--onhover u-prepended', 
			rel: 'nofollow' 
		};

	$deleteCommentLink = $('<a>', deleteCommentLinkObj)
		.append(deleteCommentSvgIconHTML, deleteCommentLinkText);

	$deleteCommentLi = $('<li>', deleteCommentLiObj).append($deleteCommentLink);

	return $deleteCommentLi;
}

function createDropdownFollowLi(comment) {
	var followLiLinkObj = { href: '#', rel: 'nofollow', 'class': 'icon--svg u-darkened--onhover u-prepended' },
		$followLiLink = $('<a>', followLiLinkObj),
		followLiLinkSvgHTML = createSvgIconHtml('add'),
		followText = 'Follow ' + comment.author.screenName;

	$followLiLink.append(followLiLinkSvgHTML, followText);
	
	var followLiObj = { 
		'class': 'js_followforuser hover-icon readonly-hide kinjamprove-follow-for-user',
	};
	
	if (kinjamprove.followingAuthor(comment.authorId)) {
		followLiObj['class'] += ' hide';
	}
	
	var $followLi = $('<li>', followLiObj)
		.append($followLiLink);		
	
	return $followLi;
}

function createDropdownFollowForBlogLi(comment) {
	var followLiLinkObj = { href: '#', rel: 'nofollow', 'class': 'icon--svg u-darkened--onhover u-prepended' },
		$followLiLink = $('<a>', followLiLinkObj),
		followLiLinkSvgHTML = createSvgIconHtml('add'),
		followText = 'Follow For Blog';

	$followLiLink.append(followLiLinkSvgHTML, followText);
	
	var followLiObj = { 
		'class': 'js_followforblog hover-icon readonly-hide kinjamprove-follow-for-blog',
	};
	
	if (comment.followedByBlog) {
		followLiObj['class'] += ' hide';
	}
	
	var $followLi = $('<li>', followLiObj)
		.append($followLiLink);		
	
	return $followLi;
}

function createDropdownUnfollowLi(comment) {
	var $unfollowLi,
		$unfollowLiLink,
		unfollowLiLinkSvgHTML = createSvgIconHtml('checkmark'),
		unfollowStr = 'Unfollow ' + comment.author.screenName,
		unfollowLiLinkObj = { 
			'class': 'icon--svg u-darkened--onhover u-prepended',
			href: '#', 
			rel: 'nofollow'
		},
		unfollowLiObj = { 
			'class': 'js_unfollowforuser hover-icon readonly-hide hide kinjamprove-unfollow-for-user' 
		};
	
	$unfollowLiLink = $('<a>', unfollowLiLinkObj)
		.append(unfollowLiLinkSvgHTML, unfollowStr);
	$unfollowLi = $('<li>', unfollowLiObj)
		.append($unfollowLiLink);

	if (kinjamprove.followingAuthor(comment.authorId)) {
		$unfollowLi.removeClass('hide'); 
	}

	return $unfollowLi;
}

function createDropdownUnfollowForBlogLi(comment) {
	var $unfollowLi,
		$unfollowLiLink,
		unfollowLiLinkSvgHTML = createSvgIconHtml('checkmark'),
		unfollowStr = 'Unfollow For Blog',
		unfollowLiLinkObj = { 
			'class': 'icon--svg u-darkened--onhover u-prepended',
			href: '#', 
			rel: 'nofollow'
		},
		unfollowLiObj = { 
			'class': 'js_unfollowforblog hover-icon readonly-hide hide kinjamprove-unfollow-for-blog' 
		};
	
	$unfollowLiLink = $('<a>', unfollowLiLinkObj)
		.append(unfollowLiLinkSvgHTML, unfollowStr);
	$unfollowLi = $('<li>', unfollowLiObj)
		.append($unfollowLiLink);

	if (comment.followedByBlog) {
		$unfollowLi.removeClass('hide'); 
	}

	return $unfollowLi;
}

function createDropdownFlagLi(comment) {
	var flagLiLinkObj = { 
			'class': 'icon--svg u-darkened--onhover u-prepended',
			href: '#',
			rel: 'nofollow'
		},
		flagLiObj = { 
			'class': 'js_flag-post hover-icon readonly-hide kinjamprove-flag-post' 
		},
		$flagLi,
		$flagLiLink,
		flagLiLinkSvgHTML = createSvgIconHtml('flag');		
	
	
	$flagLiLink = $('<a>', flagLiLinkObj).append(flagLiLinkSvgHTML, 'Flag');
	$flagLi = $('<li>', flagLiObj).append($flagLiLink);

	return $flagLi;
}

function createDropdownUnflagLi(comment) {
	var $unflagLi,
		$unflagLiLink,
		unflagSvgHtml = createSvgIconHtml('flag'),
		unflagLiLinkObj = { 
			'class': 'icon--svg u-darkened--onhover u-prepended', 
			href: '#', 
			rel: 'nofollow' 
		},
		unflagLiObj = { 
			'class': 'js_unflag-post unflag-post hover-icon readonly-hide hide kinjamprove-unflag-post' 
		};

	$unflagLiLink = $('<a>', unflagLiLinkObj).append(unflagSvgHtml, 'Unflag');
	$unflagLi = $('<li>', unflagLiObj).append($unflagLiLink);

	return $unflagLi;
}

function createDismissDropdownLi(comment) {
	var $dismissDropdownLi, 
		$dismissDropdownLink,
		dismissDropdownSvgHtml = createSvgIconHtml('user-remove'),
		dismissDropdownLinkText = 'Dismiss',
		dismissDropdownLinkObj = { 
			'class': 'dismiss icon--svg u-darkened--onhover u-prepended', 
			rel: 'nofollow' 
		},
		dismissDropdownLiObj = { 
			'class': 'js_dismiss hover-icon readonly-hide hide kinjamprove-dismiss-post' 
		};

	$dismissDropdownLink = $('<a>', dismissDropdownLinkObj)
		.append(dismissDropdownSvgHtml, dismissDropdownLinkText);

	$dismissDropdownLi = $('<li>', dismissDropdownLiObj)
		.append($dismissDropdownLink);

	return $dismissDropdownLi;
}

function createDropdownDeleteCommentIdLi(comment) {
	var $saveLi,
		$saveLink,
		saveLiText = 'Delete Saved Comment',
		saveLiObj = { 
			'class': 'kinjamprove_save icon--svg hover-icon hide kinjamprove-delete-comment-id',
			title: 'Open the options page to see all saved comments'
		};
	
	$saveLink = $('<a>', { 'class': 'icon--svg u-darkened--onhover u-prepended' })
		.append(saveLiText);

	$saveLi = $('<li>', saveLiObj)
		.append($saveLink);
	
	return $saveLi;
}	

function createDropdownSaveCommentLi(comment) {
	var $saveLi,
		$saveLink,
		saveLiText = 'Save Comment',
		saveLiObj = { 
			'class': 'kinjamprove_save icon--svg hover-icon kinjamprove-save-comment-id',
			title: 'Open the options page to see all saved comments'
		};
	
	$saveLink = $('<a>', { 'class': 'icon--svg u-darkened--onhover u-prepended' })
		.append(saveLiText);

	$saveLi = $('<li>', saveLiObj)
		.append($saveLink);
	
	return $saveLi;
}	

function createDropdownBlockUserLi(comment) {
	var $blockUserLi,
		$blockUserLink,
		blockUserSvgHTML = createSvgIconHtml('disabled'),
		blockUserLiText = 'Block ' + comment.author.screenName,
		blockUserLiObj = { 
			'class': 'blockuser icon--svg hover-icon kinjamprove-block-user',
			title: 'Block User'
		};
	
	$blockUserLink = $('<a>', { 'class': 'icon--svg u-darkened--onhover u-prepended' })
		.append(blockUserSvgHTML, blockUserLiText);

	$blockUserLi = $('<li>', blockUserLiObj)
		.append($blockUserLink);
	
	return $blockUserLi;
}	

function createDropdownBlockUserForBlogLi(comment) {
	var $blockUserLi,
		$blockUserLink,
		blockUserSvgHTML = createSvgIconHtml('disabled'),
		blockUserLiText = 'Block For Blog',
		blockUserLiObj = { 
			'class': 'blockuserforblog icon--svg hover-icon kinjamprove-block-user-for-blog',
			title: 'Block User For Blog'
		};
	
	$blockUserLink = $('<a>', { 'class': 'icon--svg u-darkened--onhover u-prepended' })
		.append(blockUserSvgHTML, blockUserLiText);

	$blockUserLi = $('<li>', blockUserLiObj)
		.append($blockUserLink);
	
	return $blockUserLi;
}	


function onBlockUserClick(event) {
	var $comment = $(this).closest('article'),
		authorId = $comment.attr('data-authorId'),
		authorName = $comment.attr('data-authorname');

	if (authorId === Utilities.getUserAuthorId()) {
		console.log("User can not block themself.");
		return;
	}

	var confirmBlockUserMessage = "Kinjamprove: Every user you block takes up a little storage space " + 
        	"on your machine, so you should only block users whose posts you see frequently.\n\n" + 
        	"Users can be unblocked on the chrome://extensions page.\n\n"
        	"Are you sure you want to block user \"" + authorName + "\"?",
		confirmBlockUser = confirm(confirmBlockUserMessage);
	
	if (!confirmBlockUser) {
		// trackerAction = 'cancel';
		// trackEvent(trackerCategory, trackerAction, trackerLabel);
		// console.log('Canceling blockUser');
		return;
	}
	
	//trackEvent(trackerCategory, trackerAction, trackerLabel);
	
	console.log('Kinjamprove: Blocking user "' + authorName + '" (authorId="' + authorId + '")');
	var blockedUser = { authorId: authorName };
	
	chrome.storage.sync.get({
		blockedUsers: '{}',
	}, function(items){
		var blockedUsers = JSON.parse(items.blockedUsers);
		
		blockedUsers[authorId] = authorName;
		blockedUsers = JSON.stringify(blockedUsers);
		if (!blockedUsers.length) {
			blockedUsers = '{}';
		}
		
		chrome.storage.sync.set({
			blockedUsers: blockedUsers
		}, function() {
			console.log('Kinjamprove: Adding new user to blocked users in storage: "', blockedUser, '"');
			console.log('Kinjamprove: updated blockedUsers:', blockedUsers);
			kinjamprove.options.blockedUsers = blockedUsers;
			blockUserPosts(authorId);
		});
	});
}

function onUpdateCommentButtonClick() {
	var $this = $(this),
		$commentBeingUpdated = $this.closest('.js_editor-placeholder[depth]').siblings('article'),
		commentBeingUpdatedId = $commentBeingUpdated.attr('data-id'),
		commentBeingUpdatedParentCommentId = $commentBeingUpdated.attr('data-parentid'),
		$textEditor = $('.scribe.editor-inner');

	/* For debugging so that post doesn't actually get created */
	// if (true) {		
// 			return;
// 		}
	setTimeout(function() {
		var publishReply = confirm('Are you sure you want to publish this update?');
		
		if (publishReply) {
			updateComment(commentBeingUpdatedId, $textEditor, commentBeingUpdatedParentCommentId);
			$('.js_editor-placeholder').empty();
		}
	}, 0);		
}



function onDeleteCommentLinkClick() {
	// console.log('onDeleteCommentLinkClick:', this);

	var confirmDeleteComment = confirm('Kinjamprove: Are you sure you want to delete this post? Once deleted it can\'t be restored.');
	
	if (!confirmDeleteComment) {
		return;
	}
	
	var $this = $(this),
		postId = $this.parent().attr('data-postid'),
		kinjaToken = Utilities.getKinjaToken();
		
	deleteComment(postId, kinjaToken);		
}


function onFollowLiClick(event) {
	event.preventDefault();
	event.stopPropagation();
	if(!kinjamprove.loggedIn){
		mustBeLoggedIn();
		return;
	}
	// console.log('onFollowLiClick:', event);
	
	var $this = $(this),
		$article = $this.closest('article'),
		targetUserId = $article.attr('data-authorid'),
		starterId = parseInt($article.attr("starterid")),
		userId = kinjamprove.accountState.authorId;
							
	followUser(targetUserId, userId).then(function(result) {
		console.log('Kinjamprove: User with id "' + userId + '" (a.k.a. You) successfully followed user w/ id "' + targetUserId + '"!');
		// console.log('result: ', result);
		

		var commentTracker = kinjamprove.commentTrackers[starterId],
			newFollowedAuthorCommentIds = commentTracker.authorMap.get(targetUserId),
			$filterSelect = commentTracker.$kinjamproveFilterSelect;
			// $followedUserComments = $discussionRegion.find('article[data-authorid="' + targetUserId + '"]');
		
		kinjamprove.accountState.followedAuthorIds[targetUserId] = 1;
		
		for(let i = 0; i < newFollowedAuthorCommentIds.length; ++i){
			let comment = commentTracker.commentsMap.get(newFollowedAuthorCommentIds[i]),
				threadId = comment.threadId,
				baseComment = commentTracker.commentsMap.get(threadId),
				$followedArticle = commentTracker.commentArticles[newFollowedAuthorCommentIds[i]];
			
			commentTracker.followedAuthorCommentIds.push(newFollowedAuthorCommentIds[i]);
			if($followedArticle){
				$followedArticle.addClass('kinjamprove-followedUser').attr('title', 'Followed Author');
				$followedArticle.find('ul.kinjamprove-comment-dropdown').children('li.js_followforuser, li.js_unfollowforuser').toggleClass('hide');
				if($filterSelect.val() == 'community' || $filterSelect.val() == 'followed'){
					commentTracker.showThreadUntilComments(comment.id);
				}
				++commentTracker.totalVisible.followed;
			}
			comment.followedAuthor = true;
			comment.articleClass += ' kinjamprove-followedUser';
			comment.articleTitle +=  "Followed Author";
			commentTracker.threadTypes.followed.set(threadId, baseComment);
			commentTracker.commentsPerThread.get(threadId).followed += 1;
		}
		commentTracker.hasBeenSorted.followed = false;
		
		if($filterSelect.val() == 'community' || $filterSelect.val() == 'followed'){
			commentTracker.commentListArticlesDescendantMap.forEach( function(value, key) {
				updateCommentRepliesDiv(value[1], key, commentTracker);
			});
			commentTracker.updateKinjamproveButton($filterSelect.val());
		}
		
		commentTracker.updateFilterSelect('followed');

	}, function(err) {
		console.error('Error in onFollowLiClick: ', err);
		alert('Kinjamprove: Error following user. If the problem persists, please contact the developer.');
	});
}


function followUser(targetUserId, userId, token) {
	token = token || kinjamprove.token.token;
	
	var followPathname = '/api/profile/userfollow/follow',
		followUrl = window.location.origin + followPathname,
		requestPayload = {
			target: targetUserId,
			targetType: 'User',
			//token: token,
			userId: (userId || kinjamprove.accountState.authorId)
		},
		requestPayloadStr = JSON.stringify(requestPayload);

	return postJSON(followUrl, requestPayloadStr, {'Authorization':'Bearer '+token});	
}

function onFollowForBlogLiClick(event) {
	event.preventDefault();
	event.stopPropagation();

	var $this = $(this),
		$article = $this.closest('article'),
		targetUserId = $article.attr('data-authorid'),
		starterId = parseInt($article.attr("starterid")),
		postId = parseInt($article.attr("data-id")),
		userId = kinjamprove.accountState.authorId,
		commentTracker = kinjamprove.commentTrackers[starterId],
		targetComment = commentTracker.commentsMap.get(postId),
		targetBlogId = targetComment.authorBlogId;
	
	followUserForBlog(starterId, targetBlogId, kinjamprove.kinja.meta.blog.id, userId, postId).then(function(result){
		var newFollowedAuthorCommentIds = commentTracker.authorMap.get(targetComment.authorId);
		kinjamprove.blogsFollowed[targetBlogId] = 1;
		
		for(let i = 0; i < newFollowedAuthorCommentIds.length; ++i){
			let comment = commentTracker.commentsMap.get(newFollowedAuthorCommentIds[i]),
				$followedArticle = commentTracker.commentArticles[newFollowedAuthorCommentIds[i]];
			
			if($followedArticle){
				$followedArticle.find('ul.kinjamprove-comment-dropdown').children('li.js_followforblog, li.js_unfollowforblog').toggleClass('hide');
			}
			
			comment.followedByBlog = true;
		}
		
	}, function(err) {
		console.error('Error in onFollowForBlogLiClick: ', err);
		alert('Kinjamprove: Error following user for blog. If the problem persists, please contact the developer.');
	});
	
}

function followUserForBlog(starterId, targetBlogId, blogId, authorId, postId, token) {
	token = token || kinjamprove.token.token;
	
	var followPathname = '/ajax/post/'+starterId+'/followAndApprove/blog/'+targetBlogId+'/by/'+blogId,
		followQueryStr = '?authorId='+authorId,
		followUrl = window.location.origin + followPathname + followQueryStr,
		requestPayload = {
			authorId: authorId,
			blogId: blogId,
			targetBlogId: targetBlogId,
			postId: postId
		},
		requestPayloadStr = JSON.stringify(requestPayload);

	return postJSON(followUrl, requestPayloadStr,{'Authorization':'Bearer '+token});	
}

function onUnfollowLiClick(event) {
	event.preventDefault();
	event.stopPropagation();
	// console.log('onUnfollowLiClick:', event);
	if(!kinjamprove.loggedIn){
		mustBeLoggedIn();
		return;
	}
	var $this = $(this),
		$article = $this.closest('article'),
		targetUserId = $article.attr('data-authorid'),
		starterId = parseInt($article.attr("starterid")),
		userId = kinjamprove.accountState.authorId;
				
	unfollowUser(targetUserId, userId).then(function(result) {
		console.log('Kinjamprove: User with id "' + userId + '" (a.k.a. You) successfully unfollowed user w/ id "' + targetUserId + '"!');
		// console.log('result: ', result);
		//$this.siblings('li.js_followforuser').addBack().toggleClass('hide');
		
		var commentTracker = kinjamprove.commentTrackers[starterId],
			unfollowedAuthorCommentIds = commentTracker.authorMap.get(targetUserId),
			$filterSelect = commentTracker.$kinjamproveFilterSelect;
			
		kinjamprove.accountState.followedAuthorIds[targetUserId] = 0;
		
		for(let i = 0; i < unfollowedAuthorCommentIds.length; ++i){
			let comment = commentTracker.commentsMap.get(unfollowedAuthorCommentIds[i]),
				threadId = comment.threadId,
				baseComment = commentTracker.commentsMap.get(threadId),
				$unfollowedArticle = commentTracker.commentArticles[unfollowedAuthorCommentIds[i]];
			
			//commentTracker.followedAuthorCommentIds.push(unfollowedAuthorCommentIds[i]);
			
			if($unfollowedArticle){
				$unfollowedArticle.removeClass('kinjamprove-followedUser').attr('title', '');
				$unfollowedArticle.find('ul.kinjamprove-comment-dropdown').children('li.js_followforuser, li.js_unfollowforuser').toggleClass('hide');
				--commentTracker.totalVisible.followed;
			}
			comment.followedAuthor = false;
			comment.articleClass = comment.articleClass.replace(' kinjamprove-followedUser', '');
			comment.articleTitle =  "";
			commentTracker.commentsPerThread.get(threadId).followed -= 1;
			if(commentTracker.commentsPerThread.get(threadId).followed == 0){
				commentTracker.threadTypes.followed.delete(threadId);
			}
		}
		commentTracker.followedAuthorCommentIds = 
			commentTracker.followedAuthorCommentIds.filter(function(value){
				if(unfollowedAuthorCommentIds.includes(value)){
					return false;
				}else{
					return true;
				}
			});
		
		commentTracker.hasBeenSorted.followed = false;
		commentTracker.updateKinjamproveButton($filterSelect.val());
		commentTracker.updateFilterSelect("unfollowed");
	}, function(err) {
		console.error('Error in onUnfollowLiClick: ', err);
		alert('Kinjamprove: Error unfollowing user. If the problem persists, please contact the developer.');
	});
}

function unfollowUser(targetUserId, userId, token) {
	token = token || kinjamprove.token.token;
	
	var unfollowPathname = '/api/profile/userfollow/unfollow',
		unfollowUrl = window.location.origin + unfollowPathname,
		requestPayload = {
			target: targetUserId,
			targetType: 'User',
			//token: token,
			userId: userId
		},
		requestPayloadStr = JSON.stringify(requestPayload);

	return postJSON(unfollowUrl, requestPayloadStr, {'Authorization':'Bearer '+token});
}

function onUnfollowForBlogLiClick(event) {
	event.preventDefault();
	event.stopPropagation();
	
	var $this = $(this),
		$article = $this.closest('article'),
		starterId = parseInt($article.attr("starterid")),
		postId = parseInt($article.attr("data-id")),
		commentTracker = kinjamprove.commentTrackers[starterId],
		targetComment = commentTracker.commentsMap.get(postId),
		targetBlogId = targetComment.authorBlogId;
		
	unfollowUserForBlog(kinjamprove.kinja.meta.blog.id, targetBlogId).then(function(result){
		
		var unfollowedAuthorCommentIds = commentTracker.authorMap.get(targetComment.authorId);
		
		kinjamprove.blogsFollowed[targetBlogId] = 0;
		
		for(let i = 0; i < unfollowedAuthorCommentIds.length; ++i){
			let comment = commentTracker.commentsMap.get(unfollowedAuthorCommentIds[i]),
				$followedArticle = commentTracker.commentArticles[unfollowedAuthorCommentIds[i]];
			
			if($followedArticle){
				$followedArticle.find('ul.kinjamprove-comment-dropdown').children('li.js_followforblog, li.js_unfollowforblog').toggleClass('hide');
			}
			
			comment.followedByBlog = false;
		}
		
	}, function(err) {
		console.error('Error in onUnfollowForBlogLiClick: ', err);
		alert('Kinjamprove: Error unfollowing user for blog. If the problem persists, please contact the developer.');
	});
}

function unfollowUserForBlog(blogId, targetBlogId, token) {
	token = token || kinjamprove.token.token;
	
	var unfollowPathname = '/api/profile/blogfollow/unfollow',
		unfollowUrl = window.location.origin + unfollowPathname,
		requestPayload = {
			sourceBlogId: blogId,
			targetBlogId: targetBlogId
		},
		requestPayloadStr = JSON.stringify(requestPayload);

	return postJSON(unfollowUrl, requestPayloadStr, {'Authorization':'Bearer '+token});
}

function onBlockForBlogLiClick(event){
	event.preventDefault();
	event.stopPropagation();
	
	if(!confirm('Block this user for '+kinjamprove.kinja.meta.blog.displayName)){
		return;
	}
	
	var $this = $(this),
		$article = $this.closest('article'),
		starterId = parseInt($article.attr("starterid")),
		postId = parseInt($article.attr("data-id")),
		commentTracker = kinjamprove.commentTrackers[starterId],
		targetComment = commentTracker.commentsMap.get(postId),
		targetBlogId = targetComment.authorBlogId;

	blockUserForBlog(kinjamprove.kinja.meta.blog.id, targetBlogId).then(function(result){
		
		var blockedAuthorCommentIds = commentTracker.authorMap.get(targetComment.authorId);
		
		for(let i = 0; i < blockedAuthorCommentIds.length; ++i){
			let comment = commentTracker.commentsMap.get(blockedAuthorCommentIds[i]),
				$blockedArticle = commentTracker.commentArticles[blockedAuthorCommentIds[i]];
			
			if($blockedArticle){
				let $li = $blockedArticle.find('li.blockuserforblog'),
					$a = $li.find('a');
				
				$li.removeClass('blockuserforblog');
				$li.removeClass('kinjamprove-block-user-for-blog');
				$li.attr('title', 'User has been blocked');
				$li.off('click');
				$a.removeClass('u-darkened--onhover');
				$a.css('cursor', 'default');
				$a.html($a.html().replace('Block For Blog', 'BLOCKED'));
			
			}

		}
		
	}, function(err) {
		console.error('Error in onBlockForBlogLiClick: ', err);
		alert('Kinjamprove: Error blocking user for blog. If the problem persists, please contact the developer.');
	});

}

function blockUserForBlog(blogId, targetBlogId, token) {
	token = token || kinjamprove.token.token;
	
	var blockPathname = '/api/profile/blogblock/block',
		blockUrl = window.location.origin + blockPathname,
		requestPayload = {
			blocked: targetBlogId,
			blocking: blogId
		},
		requestPayloadStr = JSON.stringify(requestPayload);

	return postJSON(blockUrl, requestPayloadStr,{'Authorization':'Bearer '+token});
}

function onUnflagLiClick(event) {
	event.preventDefault();
	if(!kinjamprove.loggedIn){
		mustBeLoggedIn();
		return;
	}
	var $this = $(this), 
		$article = $this.closest('article'),
		postId = $article.attr('data-id'),
		$postDropdownUl = $article.find('ul.kinjamprove-comment-dropdown');
		
	unflagPost(postId).then(function(result) {
		var str = 'Successfully unflagged post w/ id ' + postId + '! result:';
		console.log(str, result);
		postId = parseInt(postId);
		var starterId = $this.closest('section.discussion-region').attr('starter-id'),
			tracker = kinjamprove.commentTrackers[starterId],
			comment = tracker.commentsMap.get(postId),
			baseComment = tracker.commentsMap.get(comment.threadId),
			threadCount = tracker.commentsPerThread.get(comment.threadId);
		
		$postDropdownUl.children('li.js_flag-post, li.js_unflag-post').toggleClass('hide');
		$article.children('.js_reply-flagged').hide();
		$article.removeClass('kinjamprove-flagged-comment');
		
		comment.userFlagged = false;
		tracker.userFlaggedCommentIds = 
			tracker.userFlaggedCommentIds.filter(function(value){
				if(value == postId){
					return false;
				}else{
					return true;
				}
			});
		
		--threadCount.flagged;
		--tracker.totalVisible.flagged;
		
		if(threadCount.flagged){
			tracker.threadTypes.flagged.delete(comment.threadId);
		}
			
		kinjamprove.userFlaggedPostIdsMap.delete(postId);
		tracker.updateFilterSelect("flagging");
		
	}, function(err) {
		var str = 'Error trying to unflag post w/ id ' + postId + ': ';
		console.error(str, error);
		alert('Kinjamprove: Error unflagging post. If the problem persists, please contact the developer.');
	});
}

function unflagPost(postId, token) {
	token = token || kinjamprove.token.token;
	
	var unflagPathname = '/api/moderation/flagging/unflag',
		unflagUrl = window.location.origin + unflagPathname,
		requestPayload = {
			postId: postId,
			//token: token
		},
		requestPayloadStr = JSON.stringify(requestPayload);

	return postJSON(unflagUrl, requestPayloadStr, {'Authorization':'Bearer '+token});
}

function onFlagLiClick(event) {
	event.preventDefault();
	if(!kinjamprove.loggedIn){
		mustBeLoggedIn();
		return;
	}
	var $this = $(this), 
		$article = $this.closest('article'),
		$flaggedIndicatorDiv = $article.find('.js_reply-flagged'),
		postId = $article.attr('data-id');
		
	$flaggedIndicatorDiv.after(FlagCommentReasonDiv.createFlagReasonDiv());
}


var FlagCommentReasonDiv = (function() { 
	const KINJA_WHAT_IS_FLAGGING_ARTICLE_URL = 'https://kinja.desk.com' +
			'/customer/portal/articles/1726140-what-is-flagging-',
		FLAG_REASON_TEXT_1 = "It's harassment",
		FLAG_REASON_TEXT_2 = "It's hate speech",
		FLAG_REASON_TEXT_3 = "It's spam"
		FLAG_REASON_VALUE_1 = 'HARASSMENT',
		FLAG_REASON_VALUE_2 = 'HATE_SPEECH',
		FLAG_REASON_VALUE_3 = 'SPAM';

	var createReasonRadio = function(value, text, hasErrorWarningMessage) {
		var $reasonRadioDivContainer,
			$reasonRadioDiv,
			$errorWarningDiv,
			$reasonRadioLabel,
			$reasonRadioInput;
		
		$reasonRadioInput = $('<input>', { type: 'radio', name: 'reason', value: value });
		$reasonRadioLabel = $('<label>').append($reasonRadioInput, text);
		$reasonRadioDiv = $('<div>', { 'class': 'columns small-12' })
			.append($reasonRadioLabel);
		$reasonRadioDivContainer = $('<div>', { 'class': 'row radio-cont' })
			.append($reasonRadioDiv);

		if (hasErrorWarningMessage) {
			$errorWarningDiv = $('<div>', { 'class': 'column small-12 js_error hide proxima' })
				.append('<small class="warningmessage">Please select a reason</small>');
			$reasonRadioDivContainer.prepend($errorWarningDiv);
		}

		return $reasonRadioDivContainer;
	};

	return {
		createFlagReasonDiv: function() {
			var $flagDiv,
				$flagForm,
				$flagReasonHeadLabel,
				$reasonHeadLabelInfoLink,
				reasonHeadLabelInfoIconSvgHTML = '<svg class="svg-icon svg-information">' + 
					'<use xlink:href="#iconset-information"></use></svg>',
				$reasonRadioDivContainer1,
				$reasonRadioDivContainer2,
				$reasonRadioDivContainer3,
				$saveCancelButtonContainerDiv,
				$cancelButton,
				$saveButton;
			
			$reasonHeadLabelInfoLink = $('<a>', { 
				'class': 'icon', 
				href: KINJA_WHAT_IS_FLAGGING_ARTICLE_URL, 
				target: '_blank' 
			}).append(reasonHeadLabelInfoIconSvgHTML);

			$flagReasonHeadLabel = $('<label>', { 'class': 'reason-head' })
				.text('Why are you flagging this?')
				.append($reasonHeadLabelInfoLink);

			$reasonRadioDivContainer1 = createReasonRadio(FLAG_REASON_VALUE_1, FLAG_REASON_TEXT_1, true);
			$reasonRadioDivContainer2 = createReasonRadio(FLAG_REASON_VALUE_2, FLAG_REASON_TEXT_2);
			$reasonRadioDivContainer3 = createReasonRadio(FLAG_REASON_VALUE_3, FLAG_REASON_TEXT_3);

			$cancelButton = $('<a>', { 'class': 'button secondary tiny cancel js_cancel kinjamprove-flag-cancel' })
				.text('Cancel');
			$saveButton = $('<a>', { 'class': 'button secondary tiny submit js_submit kinjamprove-flag-save' })
				.text('Save');

			$saveCancelButtonContainerDiv = $('<div>', { 'class': 'flag-reason-ctas' })
				.append($cancelButton, $saveButton);

			$flagForm = $('<form>', { lpformnum: '0' })
				.append($flagReasonHeadLabel, $reasonRadioDivContainer1,
						$reasonRadioDivContainer2, $reasonRadioDivContainer3,
						$saveCancelButtonContainerDiv);

			$flagDiv = $('<div>', { 'class': 'flag-reason-dropdown js_flagreason' })
				.append($flagForm);
			
			return $flagDiv;
		},

		onCancelFlagButtonClick: function(event) {
			// console.log('onCancelFlagButtonClick; event:', event, 'this:', this);
			var $this = $(this), 
				$flagReasonDropdown = $this.closest('div.flag-reason-dropdown');
			
			$flagReasonDropdown.remove();
		},

		onSaveFlagButtonClick: function(event) {
			// console.log('onSaveFlagButtonClick; event:', event, 'this:', this);
			var $this = $(this),
				$flagReasonForm = $this.closest('form'),
				$selectedReason = $flagReasonForm.find(':checked')
				selectedReasonValue = $selectedReason.val();
				
			if (selectedReasonValue) {
				var $article = $this.closest('article'),
					postId = $article.attr('data-id'),
					$postDropdownUl = $article.find('ul.kinjamprove-comment-dropdown');

				// console.log('$article:', $article, '$postDropdownUl:', $postDropdownUl)
					
				flagPost(postId, selectedReasonValue).then(function(result) {
					postId = parseInt(postId);
					var str = 'Successfully flagged post w/ id ' + postId + '! result:',
						starterId = $this.closest('section.discussion-region').attr('starter-id'),
						tracker = kinjamprove.commentTrackers[starterId],
						comment = tracker.commentsMap.get(postId),
						baseComment = tracker.commentsMap.get(comment.threadId),
						threadCount = tracker.commentsPerThread.get(comment.threadId);
						
					console.log(str, result);
					
					$flagReasonForm.parent().remove();
					$postDropdownUl.children('li.js_flag-post, li.js_unflag-post').toggleClass('hide');
					$article.children('.js_reply-flagged').show();
					$article.addClass('kinjamprove-flagged-comment');
					
					comment.userFlagged = true;
					++threadCount.flagged;
					++tracker.totalVisible.flagged;
					tracker.threadTypes.flagged.set(comment.threadId, baseComment);
					tracker.userFlaggedCommentIds.push(postId);
					kinjamprove.userFlaggedPostIdsMap.set(postId, 1);
					tracker.updateFilterSelect("flagging");
					
				}, function(err) {
					var str = 'Error trying to flag post w/ id ' + postId + ': ';
					console.error(str, error);
					alert('Kinjamprove: Error flagging post. If the problem persists, please contact the developer.');
				});
			} else {
				var $warningMessageDiv = $flagReasonForm.find('.warningmessage').parent();
				$warningMessageDiv.toggleClass('hide');
			}
		}
	};
})();

function flagPost(postId, reason, token) {
	token = token || kinjamprove.token.token;
	
	var flagPathname = '/api/moderation/flagging/flag',
		flagUrl = window.location.origin + flagPathname,
		requestPayload = {
			postId: postId,
			reason: reason,
			//token: token
		},
		requestPayloadStr = JSON.stringify(requestPayload);

	return postJSON(flagUrl, requestPayloadStr, {'Authorization':'Bearer '+token});
}

function blockUserPosts(blockedUserAuthorId) {
	var $blockedUserPosts = $('article[data-authorid="'+blockedUserAuthorId+'"]').addClass('kinjamprove-blockedUser'),
		$headers = $blockedUserPosts.children('header'),
		$replyBylines = $headers.children('.reply__byline'),
		blockedUserContainerHtml = '<div class="blockedUserMessage">This user is blocked with Kinjamprove.</div>';
		
	$headers.find('.avatar img').attr('src', chrome.runtime.getURL('icons/kinjamprove_blocked_user_avatar.png'));
	$headers.nextAll().remove();
	$replyBylines.empty();
	$replyBylines.nextAll().remove();
	$replyBylines.append(blockedUserContainerHtml).after(createCollapseThreadButton());
	// console.log('$replyBylines:', $replyBylines,  '$headers:', $headers)
}


// 0.0.2.4
function onDismissDropdownClick() {

	var dismissCommentConfirmation = confirm('Are you sure you want to dismiss this comment?');
	
	if (!dismissCommentConfirmation) {
		return;
	}
	
	
	var postId = $(this).closest('ul').attr('data-postid'),
		defaultBlogId = Utilities.getUserDefaultBlogId(),
		kinjaToken = Utilities.getKinjaToken(),
		payload = JSON.stringify({postId: postId}),
		url = CommentApiURLFactory.getDismissPostURL();
	
	postJSON(url, payload, {'Authorization':'Bearer '+kinjaToken}).then(function(dismissedComment){
		var $dismissedComment = $('article[data-id="'+postId+'"]'),
			$dismissedCommentBody = $dismissedComment.find('div.kinjamprove-post-content'),
			$newText = $('<p>', {});

		$dismissedComment.find('ul.kinjamprove-comment-dropdown').children().hide();
		$dismissedComment.find('div.reply__sidebar').hide();
		$dismissedComment.find('div.reply__tools').hide();
		$newText.text('This post has been dismissed. Refresh the page to see full results of this action.');
		$newText.css('color', 'red');
		$newText.css('font-style', 'italic');
		$dismissedCommentBody.children().remove();
		$dismissedCommentBody.append($newText);
			
	}).catch(function(error) {
		console.log('Kinjamprove: Error dismissing comment: ', error);
		alert('Kinjamprove: Error dismissing post. If the problem persists, please contact the developer.');
	});
			
}

// 0.0.2.8 Make sure values from other instances aren't overwritten.
function onSaveCommentIdLiClick(){
	var $this = $(this),
		postId = $this.closest('ul').attr('data-postid');
	
	chrome.storage.sync.get({
		saved_comment_ids: '{}'
	},function(items){
		var saved_comment_ids = JSON.parse(items.saved_comment_ids);
		
		saved_comment_ids[postId] = 1;
		chrome.storage.sync.set({'saved_comment_ids':JSON.stringify(saved_comment_ids)});
		kinjamprove.options.saved_comment_ids = saved_comment_ids;
		$this.siblings('.kinjamprove-delete-comment-id').removeClass('hide');
		$this.addClass('hide');
		$this.closest('article').addClass('kinjamprove-saved');
	});
}

// 0.0.2.8 Make sure values from other instances aren't overwritten.
function onDeleteCommentIdLiClick() {
	var $this = $(this),
		postId = $this.closest('ul').attr('data-postid');
		
	chrome.storage.sync.get({
		saved_comment_ids: '{}'
	},function(items){
		var saved_comment_ids = JSON.parse(items.saved_comment_ids);
		
		delete saved_comment_ids[postId];
		
		chrome.storage.sync.set({'saved_comment_ids':JSON.stringify(saved_comment_ids)});
		kinjamprove.options.saved_comment_ids = saved_comment_ids;
		$this.siblings('.kinjamprove-save-comment-id').removeClass('hide');
		$this.addClass('hide');
		$this.closest('article').removeClass('kinjamprove-saved');
	});

}
