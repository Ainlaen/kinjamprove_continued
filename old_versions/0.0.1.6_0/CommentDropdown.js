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
		
		$listItems = [
			$editCommentLi, 
			$deleteCommentLi, 
			$followLi, 
			$unfollowLi, 
			$flagLi, 
			$unflagLi, 
			$dismissLi, 
			$blockUserLi
		];
	
	if (Utilities.userIsCommentAuthor(comment)) {
		$blockUserLi.addClass('hide');
	}
	
	if (!Utilities.commentIsDeletableByUser(comment)) {
		$deleteCommentLi.addClass('hide');
	}
	if (!Utilities.commentIsEditableByUser(comment)) {
		$editCommentLi.addClass('hide');
	}
	
	if (Utilities.userFlaggedPost(comment.id)) { 
		$flagLi.addClass('hide');
		$unflagLi.removeClass('hide');
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

// function DropdownLi(comment,

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
			'class': 'js_edit-reply hover-icon readonly-hide kinjamprove-edit-comment' 
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


function onBlockUserClick(event) {
	var $comment = $(this).closest('article'),
		authorId = $comment.attr('data-authorId'),
		authorName = $comment.attr('data-authorname');

	var trackerCategory = 'Block User',
		trackerAction = 'confirm',
		trackerLabel = 'Block User - ' + authorName;
	

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
		trackerAction = 'cancel';
		trackEvent(trackerCategory, trackerAction, trackerLabel);
		console.log('Canceling blockUser');
		return;
	}
	
	trackEvent(trackerCategory, trackerAction, trackerLabel);
	
	console.log('Blocking user "' + authorName + '" (authorId="' + authorId + '")');
	
	var blockedUser = { authorId: authorName },
		blockedUsers = (kinjamprove.options.blockedUsers.length) ? JSON.parse(kinjamprove.options.blockedUsers) : { };
		
	blockedUsers[authorId] = authorName;
	blockedUsers = JSON.stringify(blockedUsers);
	if (!blockedUsers.length) {
		blockedUsers = '{}';
	}
	
	chrome.storage.sync.set({
		blockedUsers: blockedUsers
	}, function() {
		console.log('Adding new user to blocked users in storage: "', blockedUser, '"');
		console.log('updated blockedUsers:', blockedUsers);
		kinjamprove.options.blockedUsers = blockedUsers;
		blockUserPosts(authorId);
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
	console.log('onDeleteCommentLinkClick:', this);
	Utilities.setWindowConfirmToNormal();
	
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
	console.log('onFollowLiClick:', event);
	
	var $this = $(this),
		$article = $this.closest('article'),
		targetUserId = $article.attr('data-authorid'),
		userId = kinjamprove.accountState.authorId;
							
	followUser(targetUserId, userId).then(function(result) {
		console.log('User with id "' + userId + '" (a.k.a. You) successfully followed user w/ id "' + targetUserId + '"!');
		console.log('result: ', result);
		$this.siblings('li.js_unfollowforuser').addBack().toggleClass('hide');
		
		var $discussionRegion = $(event.delegateTarget),
			$followedUserComments = $discussionRegion.find('article[data-authorid="' + targetUserId + '"]');

		$followedUserComments.addClass('kinjamprove-followedUser');

	}, function(err) {
		console.error('Error in onFollowLiClick: ', err);
	});
}


function followUser(targetUserId, userId, token) {
	token = token || kinjamprove.token.token;
	
	var followPathname = '/api/profile/userfollow/follow',
		followQueryStr = '?token=' + token,
		followUrl = window.location.origin + followPathname + followQueryStr,
		requestPayload = {
			target: targetUserId,
			targetType: 'User',
			token: token,
			userId: (userId || kinjamprove.accountState.authorId)
		},
		requestPayloadStr = JSON.stringify(requestPayload);

	return postJSON(followUrl, requestPayloadStr);	
}



function onUnfollowLiClick(event) {
	event.preventDefault();
	event.stopPropagation();
	console.log('onUnfollowLiClick:', event);
	
	var $this = $(this),
		$article = $this.closest('article'),
		targetUserId = $article.attr('data-authorid'),
		userId = kinjamprove.accountState.authorId;
				
	unfollowUser(targetUserId, userId)
		.then(function(result) {
			console.log('User with id "' + userId + '" (a.k.a. You) successfully unfollowed user w/ id "' + targetUserId + '"!');
			console.log('result: ', result);
			$this.siblings('li.js_followforuser').addBack().toggleClass('hide');
			 
			var $discussionRegion = $(event.delegateTarget),
				$unfollowedUserComments = $discussionRegion.find('article[data-authorid="' + targetUserId + '"]');

			$unfollowedUserComments.removeClass('kinjamprove-followedUser');
		}, function(err) {
			console.error('Error in onUnfollowLiClick: ', err);
		});
}

function unfollowUser(targetUserId, userId, token) {
	token = token || kinjamprove.token.token;
	
	var unfollowPathname = '/api/profile/userfollow/unfollow',
		unfollowQueryStr = '?token=' + token,
		unfollowUrl = window.location.origin + unfollowPathname + unfollowQueryStr,
		requestPayload = {
			target: targetUserId,
			targetType: 'User',
			token: token,
			userId: userId
		},
		requestPayloadStr = JSON.stringify(requestPayload);

	return postJSON(unfollowUrl, requestPayloadStr);
}


function onUnflagLiClick(event) {
	console.log('onUnflagLiClick');
	event.preventDefault();
	
	var $this = $(this), 
		$article = $this.closest('article'),
		postId = $article.attr('data-id'),
		$postDropdownUl = $article.find('ul.kinjamprove-comment-dropdown');
		
	unflagPost(postId).then(function(result) {
		var str = 'Successfully unflagged post w/ id ' + postId + '! result:';
		console.log(str, result);
		
		$postDropdownUl.children('li.js_flag-post, li.js_unflag-post').toggleClass('hide');
		$article.children('.js_reply-flagged').hide();
		
		delete kinjamprove.userFlaggedPostIdsMap[postId];
		
	}, function(err) {
		var str = 'Error trying to unflag post w/ id ' + postId + ': ';
		console.error(str, error);
	});
}

function onFlagLiClick(event) {
	console.log('onFlagLiClick');
	event.preventDefault();
	var $this = $(this), 
		$article = $this.closest('article'),
		$flaggedIndicatorDiv = $article.find('.js_reply-flagged'),
		postId = $article.attr('data-id');
		
	// $flaggedIndicatorDiv.after(createFlagReasonDiv());
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
			console.log('onCancelFlagButtonClick; event:', event, 'this:', this);
			var $this = $(this), 
				$flagReasonDropdown = $this.closest('div.flag-reason-dropdown');
			
			$flagReasonDropdown.remove();
		},

		onSaveFlagButtonClick: function(event) {
			console.log('onSaveFlagButtonClick; event:', event, 'this:', this);
			var $this = $(this),
				$flagReasonForm = $this.closest('form'),
				$selectedReason = $flagReasonForm.find(':checked')
				selectedReasonValue = $selectedReason.val();
				
			if (selectedReasonValue) {
				var $article = $this.closest('article'),
					postId = $article.attr('data-id'),
					$postDropdownUl = $article.find('ul.kinjamprove-comment-dropdown');

				console.log('$article:', $article, '$postDropdownUl:', $postDropdownUl)
					
				flagPost(postId, selectedReasonValue).then(function(result) {
					var str = 'Successfully flagged post w/ id ' + postId + '! result:';
					console.log(str, result);
					$flagReasonForm.parent().remove();
					$postDropdownUl.children('li.js_flag-post, li.js_unflag-post').toggleClass('hide');
					$article.children('.js_reply-flagged').show();					
				}, function(err) {
					var str = 'Error trying to flag post w/ id ' + postId + ': ';
					console.error(str, error);
				});
			} else {
				var $warningMessageDiv = $flagReasonForm.find('.warningmessage').parent();
				$warningMessageDiv.toggleClass('hide');
			}
		},

		flagPost: function(postId, reason, token) {
			var flagPathname = '/api/moderation/flagging/flag',
				flagUrl = window.location.origin + flagPathname,
				requestPayload = {
					postId: postId,
					reason: reason,
					token: (token || kinjamprove.token.token)
				},
				requestPayloadStr = JSON.stringify(requestPayload);

			return postJSON(flagUrl, requestPayloadStr);
		},

		unflagPost: function(postId, token) {
			var unflagPathname = '/api/moderation/flagging/unflag',
				unflagUrl = window.location.origin + unflagPathname,
				requestPayload = {
					postId: postId,
					token: (token || kinjamprove.token.token)
				},
				requestPayloadStr = JSON.stringify(requestPayload);

			return postJSON(unflagUrl, requestPayloadStr);
		}
	};
})();

function flagPost(postId, reason, token) {
	var flagPathname = '/api/moderation/flagging/flag',
		flagUrl = window.location.origin + flagPathname,
		requestPayload = {
			postId: postId,
			reason: reason,
			token: (token || kinjamprove.token.token)
		},
		requestPayloadStr = JSON.stringify(requestPayload);

	return postJSON(flagUrl, requestPayloadStr);
}

function unflagPost(postId, token) {
	var unflagPathname = '/api/moderation/flagging/unflag',
		unflagUrl = window.location.origin + unflagPathname,
		requestPayload = {
			postId: postId,
			token: (token || kinjamprove.token.token)
		},
		requestPayloadStr = JSON.stringify(requestPayload);

	return postJSON(unflagUrl, requestPayloadStr);
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
	console.log('$replyBylines:', $replyBylines,  '$headers:', $headers)
}


function onDismissDropdownClick() {			
	var dismissCommentConfirmation = confirm('Are you sure you want to dismiss this comment?');
	
	if (!dismissCommentConfirmation) {
		return;
	}
	
	var postId = $(this).closest('ul').attr('data-postid'),
		defaultBlogId = Utilities.getUserDefaultBlogId(),
		kinjaToken = Utilities.getKinjaToken();
		
	postDismissComment(postId, defaultBlogId, kinjaToken)
		.then(function(dismissedComment) {			
			var $dismissedComment = $('#reply_' + dismissedComment.data[0].postId),
				$dismissedCommentLi = $dismissedComment.closest('li');

			console.log('Successfully dismissed comment: ', dismissedComment);
			$dismissedCommentLi.remove();
	}).catch(function(error) {
		console.error('Error dismissing comment: ', error);
	});	
}
