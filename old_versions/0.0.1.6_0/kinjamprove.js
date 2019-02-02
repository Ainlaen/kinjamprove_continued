var kinjamprove = { 
	commentTrackers: {},
	options: { 
		preferredStyle: undefined,
		defaultComments: undefined,
		hidePendingReplies: undefined,
		sortOrder: undefined,
		hideSocialMediaButtons: undefined,
		hideSidebar: undefined,
		localizePublishTime: undefined,
		blockedUsers: undefined
	},
	userLikedPostIdsMap: {},
	userFlaggedPostIdsMap: {},
	accountState: undefined,
	isPaused: undefined,
	kinja: undefined,
	token: undefined,
	followingAuthor: function(authorId) {
		return kinjamprove.accountState.followedAuthorIds.hasOwnProperty(authorId);
	}
};

var showParentCommentTooltipTimer,
	hideParentCommentTooltipTimer;

var didScroll;
var scrollInterval;
var lastScrollTop;
var delta;
var navbarHeight;
var firstDiscussionRegionScrollTop;


$(document).ready(function() {	
	// chrome.storage.sync.get({ blockedUsers: '{}' }, function(items) {
	// 	console.log('items:', items);
	// });

	var pageHasDiscussionRegion = !!$('section.js_discussion-region').length;

	if (!pageHasDiscussionRegion) {
		console.log("Page does not have discussion region, therefore Kinjamprove won't be run.");
		return;
	}

	var $windowOnbeforeunloadButton = $('<button>', {
		id: 'kinjamprove-window-onbeforeunload-button',
		onclick: 'Utilities.setWindowOnbeforeunload()',
		style: 'display: none;'
	});


	var $kinjamproveUserInfoButton = $('<button>', { 
			id: 'kinjamprove-user-info-button',
			onclick: 'Utilities.storeVariables()'
		}
	);

	$('body').append(
		$kinjamproveUserInfoButton, 
		$windowOnbeforeunloadButton, 
		createKinjamproveFooter()
	);

	

	$kinjamproveUserInfoButton.click(onKinjamproveUserInfoButtonClick);

	chrome.storage.sync.get({
		preferredStyle: 'kinjamprove',
		sortOrder: 'likes',
		hidePendingReplies: false,
		hideSocialMediaButtons: false,
		hideSidebar: false,
		localizePublishTime: false,
		blockedUsers: '{}',
		paused: false,
	}, optionsCallback);

	// chrome.storage.sync.get({ 
	// 	preferredStyle: 'kinjamprove',
	// 	sortOrder: 'likes',
	// 	hidePendingReplies: false,
	// 	hideSocialMediaButtons: false,
	// 	hideSidebar: false,
	// 	localizePublishTime: false,
	// 	blockedUsers: '{}',
	// 	paused: false, 
	// }, pausedCallback);

	setBodyScrollIntervalEvent();
	
	function pausedCallback(items) {
		
		kinjamprove.isPaused = items.paused;
		console.log('Kinjamprove is paused:', kinjamprove.isPaused);
		
		if (!kinjamprove.isPaused) {	
			kinjamproveFunc();
		}
	}
	

	// add comments.css to page 
	Utilities.addStyleToPage('comments.css');
	
	
	var chromeExtensionBaseUrl = 'chrome-extension://' + chrome.runtime.id + '/';
	var scriptsArr = [  
		'InlineFunctions.js',		 	/* necessary */
		'kinjamproveUtilities.js' 		/* necessary */
		,
		"CommentEditorAPI.js",
		"CommentEncoder.js",
		"XhrCommentTracker.js",
		"CommentClass.js",
		"CommentDropdown.js",
		"CommentDomCreator.js"
	];

	for (var i = 0; i < scriptsArr.length; i++) {
		Utilities.addScriptToPage(scriptsArr[i]);
	}


	$('body')
		.on({
			 click: function() {
				$(this).remove();
			}
		}, 'div.lightbox-overlay');

		

});

function optionsCallback(items) {
	console.log('options: ', items);
	
	for (var prop in items) {
		kinjamprove.options[prop] = items[prop];
	}

	if (kinjamprove.options.paused) { 
		return;
	} else {
		kinjamproveFunc();
	}
	
	if (kinjamprove.options.preferredStyle  !== 'classic') {
		Utilities.addStyleToPage('kinjamprove.css');
	}
	
	if (kinjamprove.options.hideSocialMediaButtons) { 
		$('#sharingfooter').remove();
	}
	
	if (kinjamprove.options.hideSidebar) {
		$('section.sidebar').hide();
	}

	if (kinjamprove.options.localizePublishTime) {
		var $publishTimes = $('time.meta__time');
		console.log('$publishTimes:', $publishTimes);

		for (var i = 0; i < $publishTimes.length; i++) {
			setBlogPublishTimeToLocal($publishTimes[i]);
		}
	}

	if (!kinjamprove.options.blockedUsers) {
		kinjamprove.options.blockedUsers = '{}';
	}
} 

function kinjamproveFunc() {
	var $kinjamproveWindowsVariableContainer,
		firstStoryStarterId,
		$kinjamproveUserInfoButton = $('#kinjamprove-user-info-button'),
		kinjamproveWindowVarTicks = 0, 
		referralId = window.location.pathname.replace(/.*?([0-9]{6,})$/g, '$1');

	if (!isNaN(Number.parseInt(referralId))) {
		referralId = Number.parseInt(referralId);
	}

	var kinjamproveWindowVarContainerTextInterval = setInterval(function() {
		$kinjamproveUserInfoButton[0].click();
	
		var commentTracker;

		if (!firstStoryStarterId) {
			firstStoryStarterId = Utilities.getStarterIdOfFirstStory();
		}
	
		if (!$kinjamproveWindowsVariableContainer || !$kinjamproveWindowsVariableContainer.length) {
			$kinjamproveWindowsVariableContainer = $('#kinjamprove-window-variables-container');
		} 

		if ($kinjamproveWindowsVariableContainer.val().length && firstStoryStarterId) {
			console.log('User variables stored:', $('#kinjamprove-window-variables-container'));
			clearInterval(kinjamproveWindowVarContainerTextInterval);
					
			commentTracker = new XhrCommentTracker(firstStoryStarterId);
			commentTracker.hidePending = kinjamprove.options.hidePendingReplies;
			commentTracker.referralId = referralId;
			
			commentTracker.load().then(function(response) {
				console.log('commentTracker response:', response.commentsArr);
	        	commentTracker.setDiscussionRegion();
	        	commentTracker.setUnorderedList();
	        });
			kinjamprove.commentTrackers[firstStoryStarterId] = commentTracker;			
					
		} else if (kinjamproveWindowVarTicks > 60) {
			console.log('kinjamproveWindowVarTicks timed out; clearing interval');
			clearInterval(kinjamproveWindowVarContainerTextInterval);

			commentTracker = new XhrCommentTracker(Utilities.getStarterIdOfFirstStory());
			commentTracker.hidePending = kinjamprove.options.hidePendingReplies;
			commentTracker.load();
			commentTracker.setDiscussionRegion();
			kinjamprove.commentTrackers[firstStoryStarterId] = commentTracker;
		} else {
			if (kinjamproveWindowVarTicks % 5 === 0) {
				console.log('Waiting for kinjamprove-window-variables-container... ' + kinjamproveWindowVarTicks);
			}
			kinjamproveWindowVarTicks++;
		}
	
	}, 500);


	var articleObserver = new MutationSummary({
		callback: updatePageArticle,
		queries: [
			{
				element: 'article.post'
			}
			,{
				element: 'div.discussion-header'
			}
			,{
				element: '.js_content-region'
			}
			// ,{
			// 	element: '.sidebar'
			// }
			,{
				element: 'article[depth]'
			}
			,{
				element: 'div.reply-to-post__container'
			}
			,{
				element: 'time.meta__time'
			}

		]
	});
}

function updatePageArticle(summaries) {
    var summaryIndex = 0,
		pageArticleSummary = summaries[summaryIndex++],
		discussionHeaderSummary = summaries[summaryIndex++],
    	contentRegionSummary = summaries[summaryIndex++],
    	// sidebarSummary = summaries[summaryIndex++],
		commentSummary = summaries[summaryIndex++],
		replyToPostButtonContainerSummary = summaries[summaryIndex++]
		,
		blogPublishTimeSummary = summaries[summaryIndex++]
		;

    pageArticleSummary.added.forEach(function(pageArticle) {
        var $pageArticle = $(pageArticle),
        	postId = Number.parseInt($pageArticle.attr('data-id')),
        	commentTracker;
                
        commentTracker = new XhrCommentTracker(postId);
        commentTracker.hidePending = kinjamprove.options.hidePendingReplies;
       
        commentTracker.load().then(function(response) {
        	commentTracker.setDiscussionRegion();
        	commentTracker.setUnorderedList();
        });
        
		kinjamprove.commentTrackers[postId] = commentTracker;
    });
	
	discussionHeaderSummary.added.forEach(function(discussionHeader) {
		var $discussionHeader = $(discussionHeader),
			$discussionRegion = $discussionHeader.closest('section.js_discussion-region'),
			$article = $discussionRegion.siblings('.branch-wrapper').find('article'),
			postId = Number.parseInt($article.attr('data-id'));
			kinjamproveSortOrder = kinjamprove.options.sortOrder,
			$sortOrderSelect = createSortOrderSelect(postId),
			$hidePendingCommentsToggleSwitch = createHidePendingCommentsToggleSwitch(),
			// kinjamproveReloadCommentsButton = createKinjamproveReloadButton($discussionRegion),
			$kinjamproveDiscussionHeaderPanel = createKinjamproveDiscussionHeaderPanel(postId, $discussionRegion);
		
		console.log('kinjamprove.options.sortOrder=' + kinjamprove.options.sortOrder);
		
		addDiscussionRegionEvents($discussionRegion);
		
		$discussionHeader.append($kinjamproveDiscussionHeaderPanel)
		console.log('$discussionHeader added:', $discussionHeader);

		$discussionHeader.find('a[value="pending"]').hide();
	});

	contentRegionSummary.added.forEach(function(contentRegion) {
		var $contentRegion = $(contentRegion),
			$discussionRegion = $contentRegion.closest('section.js_discussion-region'),
			$storyArticle = $discussionRegion.prevAll('.branch-wrapper').find('article'),
			starterId = Number.parseInt($storyArticle.attr('data-id')),
			commentTracker = kinjamprove.commentTrackers[starterId];

		if (!commentTracker) {
			commentTracker = new XhrCommentTracker(starterId);
			commentTracker.load().then(function(){
				commentTracker.contentRegionAdded($contentRegion);
			});
		} else {
			if (!commentTracker.$contentRegion) {
				commentTracker.contentRegionAdded($contentRegion);
			}
		}
	});


	// if (kinjamprove.options.hideSidebar) {
	// 	sidebarSummary.added.forEach(function(sidebar) {
	// 		$(sidebar).hide();
	// 	});
	// }	
	
	commentSummary.added.forEach(function(comment) {
		var $comment = $(comment), 
			commentId = $comment.attr('id');
			
		if (kinjamprove && kinjamprove.userLikedPostIdsMap.hasOwnProperty(commentId)) {
			console.log('user liked post w/ id ' + commentId + ' added: ', comment);
			$comment.find('.js_like').addClass('active');
			
			delete kinjamprove.userLikedPostIdsMap[commentId];
		}			
	});


	replyToPostButtonContainerSummary.added.forEach(function(replyToPostButtonContainer) {
		var nativeReplyToPostButton = replyToPostButtonContainer.childNodes[0],
			$nativeReplyToPostButton = $(nativeReplyToPostButton),
			$kinjamproveReplyToPostButton = createKinjamproveReplyButton($nativeReplyToPostButton);

		$nativeReplyToPostButton.hide();
		$nativeReplyToPostButton.after($kinjamproveReplyToPostButton);
	});

	blogPublishTimeSummary.added.forEach(function(blogPublishTime) {
		setBlogPublishTimeToLocal(blogPublishTime);
	});
}


function setBlogPublishTimeToLocal(blogPublishTime) {
	var datetime = blogPublishTime.attributes['datetime'].value,
			datetimeLocal = new Date(datetime),
			formattedLocalDatetime = Utilities.publishTimeFormatter(datetimeLocal),
			publishTimeLink = blogPublishTime.children[0];

	publishTimeLink.innerText = formattedLocalDatetime;
}

function createKinjamproveReplyButton($nativeReplyButton) {
    var kinjamproveReplyButtonHTML = 
			$nativeReplyButton[0].outerHTML
				.replace(/(class=\")(.*?)\"/, '$1$2 kinjamprove-reply-to-blog-button"');
		$kinjamproveReplyButton = $(kinjamproveReplyButtonHTML);

    return $kinjamproveReplyButton;
}


function createKinjamproveDiscussionHeaderPanel(postId, $discussionRegion) {
	var $sortOrderSelect = createSortOrderSelect(postId),
		numOfPendingComments = $discussionRegion.attr('data-reply-count-pending'),
		$hidePendingCommentsToggleSwitch = createHidePendingCommentsToggleSwitch(numOfPendingComments),
		$kinjamproveDiscussionHeaderPanel = 
			$('<div>', { 'class': 'kinjamprove-discussion-header-panel' })
				.append($sortOrderSelect, $hidePendingCommentsToggleSwitch),
		$kinjamproveDiscussionHeaderContainer = 
			$('<div>', { 'class': 'kinjamprove-discussion-header-container' });
				


	$kinjamproveDiscussionHeaderContainer.append($kinjamproveDiscussionHeaderPanel);

	return $kinjamproveDiscussionHeaderContainer;
}

function createSortOrderSelect(postId) {
	var Option = function(value, text) {
		return {
			value: value,
			text: text,
			toHTML: function() {
				return '<option value="' + value + '">' + text + '</option>';
			}
	    };
	};
	var optionsArr = [
		// Option('popular', 'Sort by Most Popular'),
		Option('newest', 'Sort by Newest'),
		Option('oldest', 'Sort by Oldest')
		,
		// Option('personal', 'Sort by Personal'),
		Option('likes', 'Sort by Most Likes'),
		Option('replies', 'Sort by Most Replies')
	];
	var $sortOrderSelect = $('<select>', { 'class': 'kinjamproveSortOrder', postId: postId });

	for (var option of optionsArr) {
		$sortOrderSelect.append(option.toHTML());
	}

	$sortOrderSelect.val(kinjamprove.options.sortOrder);
			
	return $sortOrderSelect;
}

function onKinjamproveUserInfoButtonClick() {
	var $kinjamproveWindowsVariableContainer = $('#kinjamprove-window-variables-container'),
		kinjamproveWindowsVariableContainerVal = $kinjamproveWindowsVariableContainer.val(),
		parsed = JSON.parse(kinjamproveWindowsVariableContainerVal),
		kinja = parsed.kinja,
		accountState = parsed.accountState,
		token = parsed.token;
	//console.log('$kinjamproveWindowsVariableContainer:', kinjamproveWindowsVariableContainerVal);
	
	kinjamprove.kinja = kinja;
	kinjamprove.accountState = accountState;
	kinjamprove.token = token;
	
	var followedAuthorIds = kinjamprove.accountState.followedAuthorIds ? kinjamprove.accountState.followedAuthorIds : { };
	kinjamprove.accountState.followedAuthorIds = { };
	
	for (var id of followedAuthorIds) {
		kinjamprove.accountState.followedAuthorIds[id] = 1;
	}
	
	console.log('kinjamprove:', kinjamprove);
}

function onSortOrderSelectChange() {
	var trackerLabel = 'Sort - ' + this.value;
	trackEvent('Sort Order', 'change', trackerLabel);

	var sort = this.value,
		postId = Number.parseInt(this.attributes['postid'].value),
		commentTracker = kinjamprove.commentTrackers[postId];
	
	commentTracker.reorderCommentsOnSortChange(sort);
	
	chrome.storage.sync.set({ 'sortOrder': sort, }, function() {
		console.log('saving new sort choice to storage: "' + sort + '"');
		kinjamprove.options.sortOrder = sort;
	});			
}

function createHidePendingCommentsToggleSwitch(numOfPendingComments) {
	var hidePendingCommentsCheckboxObj = { 
			type: 'checkbox', 
			'class': 'kinjamprove-hide-pending-comments-checkbox' 
		},
		$hidePendingCommentsCheckbox = $('<input>', hidePendingCommentsCheckboxObj)
			.change(onHidePendingCommentsToggleSwitchChange),
		$hidePendingCommentsCheckboxSlider = $('<span>', { 'class': 'slider kinjamprove-hide-pending-comments-slider' }),
		$hidePendingCommentsToggleSwitch = 
			$('<label>', { 'class': 'switch kinjamprove-hide-pending-comments-switch' })
				.append($hidePendingCommentsCheckbox, $hidePendingCommentsCheckboxSlider),
		$hidePendingCommentsTextSpan = 
			createElement('span', { 'class': 'kinjamprove-hide-pending-comments-span' }, numOfPendingComments+' pending comments'), //$('<span class="kinjamprove-hide-pending-comments-span">pending comments</span>'),
		$hidePendingCommentsDiv = $('<div>',  { 'class': 'kinjamprove-hide-pending-comments-div' })
			.append($hidePendingCommentsToggleSwitch, $hidePendingCommentsTextSpan);

	if (!kinjamprove.options.hidePendingReplies) {
		$hidePendingCommentsCheckbox.prop('checked', true);
	}
	
	return $hidePendingCommentsDiv;
}

function createKinjamproveReloadButton($discussionRegion) {
	var kinjamproveReloadButtonObj = {
			'class': 'kinjamprove-reload-button',
			title: 'Reload'
		},
		kinjamproveReloadButtonText = 'Reload Comments',
		kinjamproveReloadButton = createElement('button', kinjamproveReloadButtonObj, kinjamproveReloadButtonText);

		var currentTimeFormatted = Utilities.publishTimeFormatter(Date.now()).split(' ')[1],
			lastReloadTimeSpanClass = 'kinjamprove-last-load-time',
			lastReloadTimeSpanObj = { 
				'class':  lastReloadTimeSpanClass
			},
			lastReloadTimeText = 'Last loaded at ' + currentTimeFormatted + '.';

		var lastReloadTimeSpan = createElement('span', lastReloadTimeSpanObj, lastReloadTimeText);

		var reloadButtonContainerDiv = createElement('div', { 'class': 'kinjamprove-reload-button-container' });
		appendNodesToElement(reloadButtonContainerDiv, [ lastReloadTimeSpan, kinjamproveReloadButton ]);

	// return kinjamproveReloadButton;
	return reloadButtonContainerDiv;
}

function onHidePendingCommentsToggleSwitchChange() {
	var $this = $(this),
		$discussionRegion = $this.closest('.js_discussion-region'),
		starterId = $discussionRegion.attr('starter-id'),
		checked = $this[0].checked,
		hidePendingReplies = !checked;

	trackEvent('Pending Replies', 'hide', hidePendingReplies+'')
		
	chrome.storage.sync.set({ 'hidePendingReplies': hidePendingReplies, }, function() {
		console.log('saving choice to storage: hidePendingReplies: "' + hidePendingReplies + '"');
		kinjamprove.options.hidePendingReplies = hidePendingReplies;
	});
	
	
	if (hidePendingReplies) {
		kinjamprove.commentTrackers[starterId].hidePendingComments();
	} else {
		kinjamprove.commentTrackers[starterId].showPendingComments();
	}
}

function setBodyScrollIntervalEvent() {
	var $kinjamproveFooter = $('footer#kinjamprove-footer');		

	lastScrollTop = 0;
	delta = 40;
	navbarHeight = $kinjamproveFooter.outerHeight();
	firstDiscussionRegionScrollTop = $('#js_discussion-region').offset().top;

	// on scroll, let the interval function know the user has scrolled
	$(window).scroll(function(event) {
		didScroll = true;
	});
	// run hasScrolled() and reset didScroll status
	scrollInterval = setInterval(function() {
		if (didScroll) {
	  		hasScrolled();
	  		didScroll = false;
		}
	}, 250);

	function hasScrolled() {
		// do stuff here...
		var scrollTop = window.scrollY;

		if (Math.abs(lastScrollTop - scrollTop) <= delta) {
 			return;
		}

		$('section.js_discussion-region div.parent-comment-tooltip').hide();

		// If current position > last position AND scrolled past navbar...
		if (scrollTop < firstDiscussionRegionScrollTop || (scrollTop > lastScrollTop && scrollTop > navbarHeight)) {
			// Scroll Down
			$kinjamproveFooter.removeClass('kinjamprove-nav-up').addClass('kinjamprove-nav-down');
		} else if (scrollTop > firstDiscussionRegionScrollTop 
					&& (scrollTop + $(window).height() < $(document).height())) {
			// Scroll Up
			// If did not scroll past the document (possible on mac)...
			$kinjamproveFooter.removeClass('kinjamprove-nav-down').addClass('kinjamprove-nav-up');
			
		}

		lastScrollTop = scrollTop;
	}

}

function createBackToTopButton() {
	var backToTopButton = createElement('button', { 'class': 'kinjamprove-return-to-top-button' }, 'Back to Top of Page');
	backToTopButton.addEventListener('click', function() {
		window.scrollTo(0, 0);
	});

	return backToTopButton;
}
function appendBackToTopButtonToElem($elem) {
	var $backToTopButton = 
		$('<button>', { 'class': 'kinjamprove-return-to-top-button' })
			.text('Back to Top')
			.click(function() {
				window.scrollTo(0, 0);
			});

	$elem.append($backToTopButton);
}

function addDiscussionRegionEvents($discussionRegion) {
	var parentCommentLinkEventsObj = {
			mouseover: onParentCommentLinkMouseOver,
			mouseout:  onParentCommentLinkMouseOut
			, click: onParentCommentLinkClick 
			//, click: onParentCommentLinkClick
		},
		articleEventsObj = { 
			mouseover: function showCollapseThreadButton() {
				$(this).find('a.kinjamprove-collapse-thread-button').show();
			},
			mouseout: function hideCollapseThreadButton() {
				$(this).find('a.kinjamprove-collapse-thread-button').hide();
			} 
		}, 
		collapseThreadButtonEventsObj = {
			click: onCollapseThreadButtonClick
		},
		dropdownTriggerEventsObj = {
			click: function onCommentDropdownTriggerClick(event) {
				var $dropdown = $(this).prev();
				dropdownCommentIsDismissible($dropdown);

				var editExpirationMillis = $dropdown.attr('data-edit-expires-millis');
				
				if (editExpirationMillis) {
					editExpirationMillis = Number.parseInt(editExpirationMillis);
					var currentTimeMillis = Date.now();

					if (currentTimeMillis >= editExpirationMillis) {
						$dropdown.find('li.kinjamprove-edit-comment').addClass('expired');
						$dropdown.removeAttr('data-edit-expires-millis');
					}
				}
			}
		},
		editCommentListItemEventsObj = {
			click: onEditClick
		},
		deleteCommentListItemEventsObj = {
			click: onDeleteCommentLinkClick
		},
		followForUserListItemEventsObj = {
			click: onFollowLiClick
		},
		unfollowForUserListItemEventsObj = {
			click: onUnfollowLiClick
		},
		flagPostListItemEventsObj = {
			click: onFlagLiClick
		},
		unflagPostListItemEventsObj = {
			click: onUnflagLiClick
		},
		blockUserListItemEventsObj = {
			click: onBlockUserClick
		},
		dismissPostListItemEventsObj = {
			click: onDismissDropdownClick
		},
		saveFlagPostEventsObj = {
			click: FlagCommentReasonDiv.onSaveFlagButtonClick
		},
		cancelFlagPostEventsObj = {
			click: FlagCommentReasonDiv.onCancelFlagButtonClick
		},
		kinjamproveSortOrderSelectEventsObj = {
			change: onSortOrderSelectChange
		},
		textEditorEventsObj = {
			keydown: function onTextEditorKeyDown(event) {
				var key = event.key,
					metaKey = event.metaKey;

				if (metaKey) { 
					if (key === 'u') {
						event.preventDefault();
						document.execCommand('underline');
					} else if (key === 's') {
						event.preventDefault();
						document.execCommand('strikethrough');
					}
				}
			}
		}
		replyLinkEventsObj = {
			click: onReplyLinkClick
		},
		kinjamproveReplyButtonEventsObj = {
			click: function() {
				console.log('kinjamproveReplyButtonEventsObj:', this);

				var $discussionRegion = $(this).closest('.js_discussion-region'),
					$storyArticle = $discussionRegion.siblings('section.branch-wrapper').find('article.post'),
					starterId = Number.parseInt($storyArticle.attr('data-id'));

				console.log('starterId=', starterId);
			    if (!commentEditorAPI) {
			        commentEditorAPI = new CommentEditorAPI();
			    } else {
			    	commentEditorAPI.$discussionRegion = $discussionRegion;
			    }

			    commentEditorAPI.attachEditorToComment(starterId, 'reply');
			}
		},
		likeButtonEventsObj = {
			click: likeCommentOnClick
		},
		discussionRegionEmptyStateLinkEventsObj = {
			click: function(event) {
				event.preventDefault();
				event.stopPropagation();

				var $kinjamproveReplyButton = 
					$(this).closest('section.js_discussion-region')
						.find('button.kinjamprove-reply-to-blog-button');

				$kinjamproveReplyButton[0].click();
			}
		},
		kinjamproveReloadButtonEventsObj = {
			click: function onKinjamproveReloadButtonClick(event) {
				console.log('onKinjamproveReloadButtonClick; this:', this, event);
				trackEvent('Button', 'click', 'Reload Comments');
				
				var $this = $(this),
					$discussionRegion = $this.closest('section.js_discussion-region'),
					starterId = Number.parseInt($discussionRegion.attr('starter-id')),
					commentTracker = kinjamprove.commentTrackers[starterId];
				
				$this.attr('disabled', true).css('cursor', 'not-allowed');
				commentTracker.reloadDiscussionRegion();

				var currentTimeFormatted = Utilities.publishTimeFormatter(Date.now()).split(' ')[1],
					lastReloadTimeSpanClass = 'kinjamprove-last-load-time',
					lastReloadTimeText = 'Last loaded at ' + currentTimeFormatted + '.';

				$this.prevAll('span.kinjamprove-last-load-time').text(lastReloadTimeText).show();

				setTimeout(function() {
					$this.attr('disabled', false).css('cursor', 'default');
				}, 3000);
			}
		}
		;
		
		
	var discussionRegionEventsMap = {
		'a.parent-comment-link': parentCommentLinkEventsObj,
		'article': articleEventsObj,
		'a.kinjamprove-collapse-thread-button': collapseThreadButtonEventsObj,
		'a[value="community"]': { click: DiscussionFilter.onCommunityFilterClick },
		'a[value="pending"]': { click: DiscussionFilter.onPendingFilterClick },
		'a[value="staff"]': { click: DiscussionFilter.onStaffFilterClick },
		'a.post-dropdown-trigger': dropdownTriggerEventsObj,
		'li.kinjamprove-edit-comment': editCommentListItemEventsObj,
		'li.kinjamprove-delete-comment': deleteCommentListItemEventsObj,
		'li.kinjamprove-follow-for-user': followForUserListItemEventsObj,
		'li.kinjamprove-unfollow-for-user': unfollowForUserListItemEventsObj,
		'li.kinjamprove-flag-post': flagPostListItemEventsObj,
		'li.kinjamprove-unflag-post': unflagPostListItemEventsObj,
		'li.kinjamprove-block-user': blockUserListItemEventsObj,
		'li.kinjamprove-dismiss-post': dismissPostListItemEventsObj,
		'a.kinjamprove-flag-save': saveFlagPostEventsObj,
		'a.kinjamprove-flag-cancel': cancelFlagPostEventsObj,
		'select.kinjamproveSortOrder': kinjamproveSortOrderSelectEventsObj,
		'div.editor': textEditorEventsObj,
		'a.js_reply-to-selected-post': replyLinkEventsObj,
		'button.kinjamprove-reply-to-blog-button': kinjamproveReplyButtonEventsObj,
		'a.discussion-empty-state': discussionRegionEmptyStateLinkEventsObj,
		'a.js_like': likeButtonEventsObj,
		'button.kinjamprove-reload-button': kinjamproveReloadButtonEventsObj
	};

	for (var delegateSelector in discussionRegionEventsMap) {
		var delegateEvents = discussionRegionEventsMap[delegateSelector];
		$discussionRegion.on(delegateEvents, delegateSelector);
	}
}

var DiscussionFilter = (function() { 
	const DISCUSSION_FILTER_CLASS = 'YdwKLh7Umn',
          ACTIVE_DISCUSSION_FILTER_CLASS = '_303RLV4Fvo';
          
	var onFilterClick = function(event) {
		event.preventDefault();
		event.stopPropagation();
		
		if (this.className.indexOf(ACTIVE_DISCUSSION_FILTER_CLASS) > -1) {
			return;
		}

		var $filtersList = $(this.parentNode.parentNode);
	
		$filtersList.find('a.'+ACTIVE_DISCUSSION_FILTER_CLASS).removeClass(ACTIVE_DISCUSSION_FILTER_CLASS); 
		this.className += ' ' + ACTIVE_DISCUSSION_FILTER_CLASS;
	};
	
	return {
		onCommunityFilterClick: function(event) {
			console.log('onCommunityFilterClick clicked; event: ', event, 'this:', this);
			onFilterClick.bind(this)(event);
	
			var $discussionRegion = $(this).closest('section.js_discussion-region'),
				$pendingComments = $discussionRegion.find('article.reply--unapproved:not(.kinjamprove-followedUser)');
	
			// $pendingComments.parent().hide();

			// var starterId = Number.parseInt($(this).closest('.js_discussion-region').attr('starter-id')),
			// 	commentTracker = kinjamprove.commentTrackers[starterId];
			
			// commentTracker.$nativeCommentList.hide();
			// commentTracker.$commentList.show();
		},
		
		onPendingFilterClick: function(event) {
			console.log('onPendingFilterClick clicked; event: ', event, 'this:', this);
			onFilterClick.bind(this)(event);

			var $discussionRegion = $(this).closest('section.js_discussion-region'),
				$pendingComments = $discussionRegion.find('article.reply--unapproved');
	
			$pendingComments.parent().show();
		},
		
		onStaffFilterClick: function(event) {
			console.log('onStaffFilterClick clicked; event: ', event, 'this:', this);
			onFilterClick.bind(this)(event);

			// var starterId = Number.parseInt($(this).closest('.js_discussion-region').attr('starter-id')),
			// 	commentTracker = kinjamprove.commentTrackers[starterId];
			// commentTracker.$commentList.hide();
			// commentTracker.$contentRegion.append(commentTracker.$nativeCommentList);

		}
	};
})();

function trackEvent(category, action, label) {
	// console.log('trackEvent; event:', event);
	
	// if (arguments.length === 1) {
	// 	if (typeof arguments[0] === 'string') {
	// 		label = arguments[0];
	// 	} else {
	// 		event = arguments[0];
	// 		label = event.currentTarget.title || event.currentTarget.classList[0];
	// 	}
	// }

	if (arguments.length === 1 && typeof arguments[0] === 'object') {
		category = arguments[0].category;
		action = arguments[0].action;
		label = arguments[0].label;
	}

	category = category || 'Button';
	action = action || 'click';
	label = label || '';

	chrome.runtime.sendMessage({ 
		to: 'background', 
		val: 'track', 
		category: category,
		action: action,
		label: label
	});
}

function onCollapseThreadButtonClick(event) {
	// console.log('onCollapseThreadButtonClick; event:', event);
	trackEvent('Button', 'click', event.currentTarget.title);

	var $this = $(this),
		$commentLi = $this.closest('li.commentlist__item');//.parent();

	$commentLi.toggleClass('collapsed');
	
	if ($commentLi.hasClass('collapsed')) {
		$this.attr('title', 'Expand').text('+');
	} else {
		$commentLi
			.find('a.kinjamprove-collapse-thread-button')
				.attr('title', 'Collapse')
				.text('−')
			.end()
			.find('li.collapsed')
			.removeClass('collapsed');
	}


	// var $this = $(this),
	// 	$comment = $this.closest('article'),
	// 	depth = Number.parseInt($comment.attr('depth'));
		
	// if (depth === 0) {
	// 	$comment.toggleClass('collapsed');
	// }
			
	// if ($this.hasClass('collapse')) {	
	// 	$comment
	// 		.siblings().hide()
	// 			.find('article').addClass('collapsed')
	// 			.end()
	// 		.end()
	// 		.children('header').nextAll().hide();	
		
	// 	$this.removeClass('collapse').attr('title', 'Expand').text('+');
	// } else {
	// 	$comment
	// 		.children(':not(div.js_reply-flagged)').show()
	// 		.end()
	// 		.siblings().show()
	// 			.find('a.kinjamprove-collapse-thread-button')
	// 				.addClass('collapse')
	// 				.attr('title', 'Collapse').text('−')
	// 			.end()
	// 			.find('article').removeClass('collapsed')
	// 			.children('header').nextAll(':not(div.js_reply-flagged)').show();

	// 	$this.addClass('collapse').attr('title', 'Collapse').text('−')
	// }
}

function dropdownCommentIsDismissible($dropdown, userAuthorId) {
	var dropdownData = $dropdown[0].dataset,
		dropdown_is_dismissible = dropdownData['kinjamproveDismissible'];
		
	if (typeof dropdown_is_dismissible !== 'undefined') {
		return dropdown_is_dismissible;
	}

    userAuthorId = userAuthorId || Utilities.getUserAuthorId();

    var dropdownAuthorId = dropdownData['authorid'],
    	$comment = $dropdown.closest('article');
  
    if (userAuthorId === dropdownAuthorId) {
    	dropdownData['kinjamproveDismissible'] = false;
    	return;
    }

    if ($comment.attr('depth') === '0') {
    	var $discussionRegion = $comment.closest('section.js_discussion-region'),
    		staffNamesArr = $discussionRegion.attr('staff-names').split(','),
    		userScreenName = Utilities.getKinjamproveWindowVariablesContainerJSON().accountState.screenName;

    	for (var i = 0; i < staffNamesArr.length; i++) {
    		if (staffNamesArr[i] === userScreenName) {
    			$dropdown.attr('data-kinjamprove-dismissible', 'true')
    				.children('li.kinjamprove-dismiss-post').removeClass('hide');
    			break;
    		}
    	}
    	return;
    }

	var $closestUserCommentLi = $dropdown.closest('li[data-authorid="'+userAuthorId+'"]');

	if ($closestUserCommentLi.length) {
		$closestUserCommentLi
			.find('article:not([data-authorid="'+userAuthorId+'"]) ul.kinjamprove-comment-dropdown')
			.attr('data-kinjamprove-dismissible', 'true')
				.children('li.kinjamprove-dismiss-post')
				.removeClass('hide');
	}
}

function onParentCommentLinkClick(event) {
	trackEvent('Button', 'click', 'Parent Comment Link');
    $('nav.js_top-nav').removeClass('shown fixed global-nav--scrollback');
}

// function onParentCommentLinkClick(event) {
// 	event.preventDefault();			    
//     var hash = this.hash,
//         $parentCommentAnchor = $(hash),
//         $navBar = $('nav.js_global-nav-wrap')
//         $navBarContainer;
    
// 	if ($navBar.length) {
// 		$navBarContainer = $navBar.parent();
// 		$navBarContainer.hide();

// 		 setTimeout(function(){
// 		 	$navBar.removeClass('shown');
// 		 	$navBarContainer.show();
// 	    }, 1000);
// 	}
	
// 	/* based on code from: 
// 	*     https://stackoverflow.com/questions/4801655/how-to-go-to-a-specific-element-on-page 
// 	*/
// 	$('html, body').animate({
//         scrollTop: $parentCommentAnchor.closest('li').offset().top + 'px'
//     }, 'fast');   
// }


function addParentCommentLinkMouseEvents() {   
	var $parentCommentLinks = $('.parent-comment-link'); 
	
	$parentCommentLinks.on({
		'mouseover': onParentCommentLinkMouseOver,
	    'mouseout': onParentCommentLinkMouseOut
	});	
}

function onParentCommentLinkMouseOut() {
	var _this = this;
	
	clearTimeout(showParentCommentTooltipTimer);
	showParentCommentTooltipTimer = null;
		
	hideParentCommentTooltipTimer = setTimeout(function() {
		$(_this).children('.parent-comment-tooltip').css('display', 'none');
	}, 100);
}

function onParentCommentLinkMouseOver() {
	var _this = this;

	clearTimeout(hideParentCommentTooltipTimer);
	hideParentCommentTooltipTimer = null;
	
	showParentCommentTooltipTimer = setTimeout(function() {		
		var $this = $(_this),
			$parentCommentTooltip = $this.children('.parent-comment-tooltip');
				
		if ($parentCommentTooltip.length) {
			$parentCommentTooltip.css('display', 'block');
			return;
		}

		var $article = $($this.closest('article')),
			parentCommentDataId = $article.attr('data-parentid'),
			parentCommentTooltipSelector = '#parent-tooltip_' + parentCommentDataId;
		
		$parentCommentTooltip = $(parentCommentTooltipSelector);

		if (!$parentCommentTooltip.length) {
			createParentCommentTooltip($article);
		} 

		$this.prepend($parentCommentTooltip);

		$parentCommentTooltip.css('display', 'block');
	}, 400);
}



function getDiscussionRegionOfCurrentLocation() {
	var refId = Utilities.getRefIdFromURL(),
		$discussionRegion = $('section.js_discussion-region[starter-id="' + refId + '"]');

	return ($discussionRegion.length) ? $discussionRegion : $('section#js_discussion-region');
}

function createBackToTopOfDiscussionRegionButton() {
	var backToTopDiscussionRegionButton = createElement('button', { 'class': 'kinjamprove-back-to-discussion-region-top' }, 'Back to Top of Comments');

	backToTopDiscussionRegionButton.addEventListener('click', function() {
		var $discussionRegion = getDiscussionRegionOfCurrentLocation(),
			discussionRegionOffsetTop = $discussionRegion.offset().top;

		if (discussionRegionOffsetTop > window.scrollY) {
			var discussionRegionStarterId = $discussionRegion.attr('starter-id');
				$discussionRegions = $('section.js_discussion-region');

				for (var i = 1; i < $discussionRegions.length; i++) {
					var currDiscussionRegion = $discussionRegions[i],
						currStarterId = 
							currDiscussionRegion.attributes['starter-id'].value;

				    if (currStarterId === discussionRegionStarterId) {
				        console.log(i, $discussionRegion);
						$discussionRegion = $($discussionRegions[i-1]);
				        break;
				    }
				}
		}

		$('html, body').animate({
       		scrollTop: $discussionRegion.offset().top + 'px'
    	}, 'fast');   
	});

	return backToTopDiscussionRegionButton;	
}

function createKinjamproveFooter() {
	var kinjamproveFooterObj = { 
			id: 'kinjamprove-footer', 
			'class': 'kinjamprove-back-to-top-footer kinjamprove-footer' 
		},
		kinjamproveFooter = createElement('footer', kinjamproveFooterObj),
		backToTopOfPageButton = createBackToTopButton(),
		backToTopOfDiscussionRegionButton = createBackToTopOfDiscussionRegionButton();

	appendNodesToElement(kinjamproveFooter, [ backToTopOfDiscussionRegionButton, backToTopOfPageButton ]);

	return kinjamproveFooter;
}

