var kinjamprove = { 
	commentTrackers: {},
	headers: {},
	options: { 
		preferredStyle: undefined,
		hidePendingReplies: undefined,
		sortOrder: undefined,
		hideSocialMediaButtons: undefined,
		hideSidebar: undefined,
		localizePublishTime: undefined,
		blockedUsers: undefined,
		defaultToCommunity: undefined,
		minCommentsToLoad: undefined
	},
	userLikedPostIdsMap: new Map(),
	userFlaggedPostIdsMap: new Map(),
	accountState: undefined,
	// 0.0.1.8
	loggedIn: undefined,
	isPaused: undefined,
	kinja: undefined,
	token: undefined,
	followingAuthor: function(authorId) {
		return kinjamprove.accountState.followedAuthorIds.hasOwnProperty(authorId);
	}
};

var showParentCommentTooltipTimer,
	hideParentCommentTooltipTimer;

var removedButton = false;
var didScroll;
var scrollInterval;
var lastScrollTop;
var delta;
var navbarHeight;
var firstDiscussionRegionScrollTop;


$(function() {
	var pageHasDiscussionRegion = !!$('section.js_discussion-region').length;

	if (!pageHasDiscussionRegion) {
		console.log("Page does not have discussion region, therefore Kinjamprove won't be run.");
		return;
	}
	document.addEventListener('kinjamproveGlobalPasser', function(response) {
		if(response.detail){
			kinjamprove.kinja = response.detail.kinja;
			kinjamprove.userData = response.detail.account;
			kinjamprove.accountState = kinjamprove.userData.data.accountState;
			kinjamprove.token = kinjamprove.userData.data.token;
			kinjamprove.kinja.meta.authors	= kinjamprove.kinja.postMeta.authors;
			kinjamprove.kinja.meta.curatedReplyCounts = kinjamprove.kinja.postMeta.curatedReplyCounts;
			kinjamprove.kinja.meta.discussionSettings = kinjamprove.kinja.postMeta.discussionSettings;
			kinjamprove.kinja.meta.post = kinjamprove.kinja.postMeta.post;
			kinjamprove.kinja.meta.postId = kinjamprove.kinja.postMeta.postId;
			kinjamprove.kinja.meta.starterAuthorId = kinjamprove.kinja.postMeta.starterAuthorId;
			kinjamprove.kinja.meta.starterId = kinjamprove.kinja.postMeta.starterId;					
		}
	}, true);

	var passGlobals = document.createElement('script');
	passGlobals.textContent = '('+function(){
		var newEvent = new CustomEvent('kinjamproveGlobalPasser', JSON.parse(JSON.stringify({detail:{kinja: kinja, account: _user}})));
		document.dispatchEvent(newEvent);
		// Disable Kinja native waypoints. Called after comments section is loaded.
		document.addEventListener('disableWaypoints', function(response) {
			if(window.Waypoint){
				window.Waypoint.disableAll();
			}
		});
		// Clear confirmation for navigating away from page.
		document.addEventListener('clearOnbeforeunload', function(response) {
			window.onbeforeunload = null;
		});
	}+')();';
	(document.head||document.documentElement).appendChild(passGlobals);
	passGlobals.parentNode.removeChild(passGlobals);
	
	
	
	var $windowOnbeforeunloadButton = $('<button>', {
		id: 'kinjamprove-window-onbeforeunload-button',
		onclick: 'Utilities.setWindowOnbeforeunload()',
		style: 'display: none;'
	});
	
	$('body').append(
		//$kinjamproveUserInfoButton, 
		// createKinjamproveFooter()
		$windowOnbeforeunloadButton 
	);

	// Event listener
	
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
		minCommentsToLoad: 50
	}, optionsCallback);
	

	// setBodyScrollIntervalEvent();
	
	// var scriptsArr = [  
		// 'InlineFunctions.js',		 	/* necessary */
		// 'kinjamproveUtilities.js' 		/* necessary */
		// ,
		// "CommentEditorAPI.js",
		// "CommentEncoder.js",
		// "XhrCommentTracker.js",
		// "CommentClass.js",
		// "CommentDropdown.js",
		// "CommentDomCreator.js"
	// ];

	// for (var i = 0; i < scriptsArr.length; i++) {
		// Utilities.addScriptToPage(scriptsArr[i]);
	// }

	$('body')
		.on({
			 click: function() {
				$(this).remove();
			}
		}, 'div.lightbox-overlay');
	


	//b.didScroll&&!e.isTouch||(b.didScroll=!0,e.requestAnimationFrame(a)
	//$('.js_postbottom-waypoint-hook').remove();

});

function optionsCallback(items) {
	console.log('Kinjamprove: options: ', items);
	
	for (var prop in items) {
		kinjamprove.options[prop] = items[prop];
	}

	if (kinjamprove.options.paused) { 
		var msgObj = { to: "background", val: "changeicon"};
		chrome.runtime.sendMessage(msgObj);
		return;
	} 
	// 0.0.1.8 Stop infinite scrolling
	$('div.js_reading-list').remove();
	
	let $sharingFooter = $('div.sharingfooter__wrapper');
	addNavButtons($sharingFooter);
	Utilities.addStyleToPage('comments.css');
	kinjamproveFunc();


	if (kinjamprove.options.preferredStyle  !== 'classic') {
		Utilities.addStyleToPage('kinjamprove.css');
	}
	
	if (kinjamprove.options.hideSocialMediaButtons) { 
		$('div.sharingfooter__content').hide();
		//$('#sharingfooter').remove();
	}
	
	if (kinjamprove.options.hideSidebar) {
		$('section.sidebar').hide();
	}

	if (kinjamprove.options.localizePublishTime) {
		var $publishTimes = $('time.meta__time');
		console.log('Kinjamprove: $publishTimes:', $publishTimes);

		for (var i = 0; i < $publishTimes.length; i++) {
			setBlogPublishTimeToLocal($publishTimes[i]);
		}
	}

	if (!kinjamprove.options.blockedUsers) {
		kinjamprove.options.blockedUsers = '{}';
	}
} 

function kinjamproveFunc() {
	var //$kinjamproveWindowsVariableContainer,
		firstStoryStarterId,
		//$kinjamproveUserInfoButton = $('#kinjamprove-user-info-button'),
		kinjamproveWindowVarTicks = 0, 
		referralId = window.location.pathname.replace(/.*?([0-9]{6,})$/g, '$1'),
		notArticle = false,
		userIsStaff = false,
		userIsAuthor = false;
		
	if (!isNaN(Number.parseInt(referralId))) {
		referralId = Number.parseInt(referralId);
	}

	// 0.0.1.8
	if (referralId == window.location.pathname.substring(1, window.location.pathname.length)){
		notArticle = true;
	}


	var commentTracker,
		$spinner;
		
	kinjamprove.waiting = true;
	// Wait on kinjamproveGlobalPasser
	var kinjamproveWindowVarContainerTextInterval = setInterval(function() {
		//$kinjamproveUserInfoButton[0].click();

		if (kinjamprove.kinja) {
			clearInterval(kinjamproveWindowVarContainerTextInterval);
			kinjamprove.waiting = false;
			if($spinner && $spinner.length){
				$spinner.hide();
			}
			firstStoryStarterId = Utilities.getStarterIdOfFirstStory();
			setKinjamproveUserInfo();
			userIsAuthor = kinjamprove.kinja.meta.starterAuthorId == kinjamprove.accountState.authorId;
			
			if(!userIsAuthor){
				for(let i = 0; !userIsAuthor && i < kinjamprove.kinja.postMeta.post.authors.length; ++i){
					if(kinjamprove.accountState.authorId == kinjamprove.kinja.postMeta.post.authors[i].id){
						userIsAuthor = true;
					}
				}
			}
			if(userIsAuthor){
				userIsStaff = true;
			}else if(kinjamprove.accountState.membership){
				for(let i = 0; !userIsStaff && i < kinjamprove.accountState.membership.length; ++i){
					if(kinjamprove.accountState.membership[i].blogId == kinjamprove.kinja.meta.blog.id){
						userIsStaff = kinjamprove.accountState.membership[i].role;
					}
				}
			}

			kinjamprove.commentTrackers[firstStoryStarterId] = new XhrCommentTracker(firstStoryStarterId);
			commentTracker = kinjamprove.commentTrackers[firstStoryStarterId];
			commentTracker.hidePending = kinjamprove.options.hidePendingReplies;
			commentTracker.referralId = referralId;
			// 0.0.1.8
			commentTracker.userIsAuthor = userIsAuthor;
			commentTracker.userIsStaff = userIsStaff;
			commentTracker.notArticle = notArticle;
			commentTracker.load(kinjamprove.loggedIn).then(function(response) {
				console.log('Kinjamprove: commentTracker response:', response);
	        	commentTracker.setDiscussionRegion();
	        	commentTracker.setUnorderedList();
	        });
					
		}else if (kinjamproveWindowVarTicks > 300) {
			console.log('Kinjamprove: kinjamproveWindowVarTicks timed out; clearing interval');
			clearInterval(kinjamproveWindowVarContainerTextInterval);
			kinjamprove.waiting = false;
			$spinner.hide();
			let $repliesWrapper = $('div.js_replies-wrapper'),
				$failSpan = $("<span>", {'class': 'kinjamprove-failure', 'text': 'Kinjamprove timed out while loading. Please refresh the page to load comments.'});
			$repliesWrapper.append($failSpan);
		} else {
			if (kinjamproveWindowVarTicks % 40 === 0) {
				console.log('Kinjamprove: Waiting for kinjamprove-window-variables-container... ' + kinjamproveWindowVarTicks);
			}
			if(kinjamproveWindowVarTicks == 30){
				$spinner = $("span.spinner");
				$spinner = $($spinner[0]);
				$('div.js_replies-wrapper').append($spinner);
			}
			kinjamproveWindowVarTicks++;
		}
	
	}, 50);


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
			// ,{
				// element: 'article[depth]'
			// }
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
	// 0.0.1.8 Stop from loading too many trackers.
	if(Object.keys(kinjamprove.commentTrackers).length > 2){
		return;
	}
    var summaryIndex = 0,
		pageArticleSummary = summaries[summaryIndex++],
		discussionHeaderSummary = summaries[summaryIndex++],
    	contentRegionSummary = summaries[summaryIndex++],
    	// sidebarSummary = summaries[summaryIndex++],
		//commentSummary = summaries[summaryIndex++],
		replyToPostButtonContainerSummary = summaries[summaryIndex++],
		blogPublishTimeSummary = summaries[summaryIndex++];
	//console.log('pageArticleSummary', pageArticleSummary, 'discussionHeaderSummary', discussionHeaderSummary, 'contentRegionSummary', contentRegionSummary, 'replyToPostButtonContainerSummary', replyToPostButtonContainerSummary, 'blogPublishTimeSummary', blogPublishTimeSummary);
	
    pageArticleSummary.added.forEach(function(pageArticle) {
        var $pageArticle = $(pageArticle),
        	postId = Number.parseInt($pageArticle.attr('data-id')),
        	commentTracker;
                
        kinjamprove.commentTrackers[postId] = new XhrCommentTracker(postId);
		commentTracker = kinjamprove.commentTrackers[postId];
        commentTracker.hidePending = kinjamprove.options.hidePendingReplies;
        commentTracker.load(kinjamprove.loggedIn).then(function(response) {
        	commentTracker.setDiscussionRegion();
        	commentTracker.setUnorderedList();
        });
        
    });
	
	discussionHeaderSummary.added.forEach(function(discussionHeader) {
		var $discussionHeader = $(discussionHeader),
			$discussionRegion = $discussionHeader.closest('section.js_discussion-region'),
			$article = $discussionRegion.siblings('.branch-wrapper').find('article'),
			postId = Number.parseInt($article.attr('data-id')),
			$kinjamproveDiscussionHeaderPanel = $('<div>', { 'class': 'kinjamprove-discussion-header-container' });
			//referralId = window.location.pathname.replace(/.*?([0-9]{6,})$/g, '$1');
		
		// if (!isNaN(Number.parseInt(referralId))) {
			// referralId = Number.parseInt(referralId);
		// }
		if(!kinjamprove.headers[postId]){
			kinjamprove.headers[postId] = true;
			createKinjamproveDiscussionHeaderLi(postId, $discussionRegion, $discussionHeader.find('ul'));
			//console.log('kinjamprove.options.sortOrder=' + kinjamprove.options.sortOrder);
			
			addDiscussionRegionEvents($discussionRegion, postId);
			$discussionHeader.append($kinjamproveDiscussionHeaderPanel);
			//console.log('$discussionHeader added:', $discussionHeader);
		}

	});

	contentRegionSummary.added.forEach(function(contentRegion) {
		console.log('contentRegionSummary',contentRegionSummary);
		var $contentRegion = $(contentRegion),
			$discussionRegion = $contentRegion.closest('section.js_discussion-region'),
			$storyArticle = $discussionRegion.prevAll('.branch-wrapper').find('article'),
			starterId = Number.parseInt($storyArticle.attr('data-id')),
			commentTracker = kinjamprove.commentTrackers[starterId];
		
		if (!kinjamprove.waiting && !commentTracker) {
			kinjamprove.commentTrackers[starterId] = new XhrCommentTracker(starterId);
			commentTracker = kinjamprove.commentTrackers[starterId];
			commentTracker.hidePending = kinjamprove.options.hidePendingReplies;
			commentTracker.load(kinjamprove.loggedIn).then(function(){
				//commentTracker.contentRegionAdded($contentRegion);
			});
		} else if (commentTracker && commentTracker.finished){
			if(!commentTracker.$contentRegion) {

				commentTracker.contentRegionAdded($contentRegion);
			}
		} else{
			var waitOnTracker = setInterval(function(){
				if (commentTracker && commentTracker.finished){
					clearInterval(waitOnTracker);
					if(!commentTracker.$contentRegion) {
						commentTracker.contentRegionAdded($contentRegion);
					}
				}
			},100);
		}
	});


	// if (kinjamprove.options.hideSidebar) {
	// 	sidebarSummary.added.forEach(function(sidebar) {
	// 		$(sidebar).hide();
	// 	});
	// }	
	
	// commentSummary.added.forEach(function(comment) {
		// var $comment = $(comment), 
			// commentId = $comment.attr('id');
			
		// if (kinjamprove && kinjamprove.userLikedPostIdsMap.has(commentId)) {
			// console.log('Kinjamprove: user liked post w/ id ' + commentId + ' added: ', comment);
			// $comment.find('.js_like').addClass('active');
			
			// kinjamprove.userLikedPostIdsMap.delete(commentId);
		// }
	// });


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
			formattedLocalDatetime = Utilities.publishTimeFormatter(datetimeLocal);
			//publishTimeLink = blogPublishTime.children[0];
	//0.0.1.8
	blogPublishTime.innerText = formattedLocalDatetime;
}

function createKinjamproveReplyButton($nativeReplyButton) {
    var kinjamproveReplyButtonHTML = 
			$nativeReplyButton[0].outerHTML
				.replace(/(class=\")(.*?)\"/, '$1$2 kinjamprove-reply-to-blog-button"');
		$kinjamproveReplyButton = $(kinjamproveReplyButtonHTML);

    return $kinjamproveReplyButton;
}

function createKinjamproveDiscussionHeaderLi(postId, $discussionRegion, $filterUl) {
	var $sortOrderSelect = createSortOrderSelect(postId),
		$sortOrderText = createElement('span', { 'class': 'kinjamprove-sortorder-text-span' }, 'Sort By: '),
		numOfPendingComments = $discussionRegion.attr('data-reply-count-pending'),
		$hidePendingCommentsToggleSwitch = createHidePendingCommentsToggleSwitch(numOfPendingComments),
		$kinjamprovePendingSwitchLi = 
			$('<li>', { 'class': 'kinjamprove-discussion-header-li-pending' })
				.append($hidePendingCommentsToggleSwitch);
				
		// $filterLis = $filterUl.find('li');

	// $filterLis.hide();
	$filterUl.append($kinjamprovePendingSwitchLi);
	$filterUl.addClass('kinjamprove-filters-ul');
	
	let $sortingDiv = $filterUl.parent().siblings();
	
	$sortingDiv.removeClass('hide-for-small').addClass('kinjamprove-sorting');
	//$sortingDiv.children('div').hide();
	$sortingDiv.append($sortOrderSelect);
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
		Option('newest', '🠁⧖Newest In Thread'),
		Option('oldest', '🠃⧖Oldest'),
		// Option('personal', 'Sort by Personal'),
		Option('likes', '☆Most Likes In Thread'),
		Option('replies', '♡Most Replies')
	];
	var $sortOrderSelect = $('<select>', { 'class': 'kinjamproveSortOrder', postId: postId });

	for (var option of optionsArr) {
		$sortOrderSelect.append(option.toHTML());
	}

	$sortOrderSelect.val(kinjamprove.options.sortOrder);
			
	return $sortOrderSelect;
}
// 0.0.1.8
function appendFilterSelect(postId){
	let $filterSelect = createFilterSelect(postId),
		tracker = kinjamprove.commentTrackers[postId],
		$filterUl = tracker.$discussionRegion.find('ul.kinjamprove-filters-ul'),
		$filterSelectTextSpan = $('<span>',  { 'class': 'kinjamprove-filter-select-span' }).text('Filter By:'),
		$filterSelectDiv = $('<div>',  { 'class': 'kinjamprove-filter-select-div' })
			.append($filterSelectTextSpan, $filterSelect),
		$filterSelectLi = $('<li>',  { 'class': 'kinjamprove-filter-select-li' }).append($filterSelectDiv);
		
		$filterUl.prepend($filterSelectLi);
	
	return $filterSelect;
}
// 0.0.1.8
function createFilterSelect(postId) {
	var Option = function(value, text) {
		return {
			value: value,
			text: text,
			toHTML: function() {
				return '<option value="' + value + '">' + text + '</option>';
			}
	    };
	};
	var tracker = kinjamprove.commentTrackers[postId],
		$filterSelect = $('<select>', { 'class': 'kinjamprove-filter-select', postId: postId }),
		optionsArr = [],
		textValue = tracker.approvedCommentIds.length ? (' (' + tracker.approvedCommentIds.length + ')') : '',
		setValue;

	if(tracker.notArticle){
		optionsArr.push(Option('curated', 'User Curated'));
		setValue = "curated";
	}
	
	optionsArr.push(Option('community', 'Community' + textValue));
	
	if(tracker.staffCommentIdsMap.size){
		optionsArr.push(Option('staff', 'Staff (' + tracker.staffCommentIdsMap.size+')'));

		if(!kinjamprove.options.defaultToCommunity){
			setValue = setValue || "staff";
		}
	}
	if(tracker.userLikedCommentIds.length){
		optionsArr.push(Option('liked', 'Liked Comments ('+tracker.userLikedCommentIds.length+')'));
	}
	if(tracker.followedAuthorCommentIds.length){
		optionsArr.push(Option('followed', 'Followed Authors ('+tracker.followedAuthorCommentIds.length+')'));
	}	
	if(tracker.userCommentIds.length){
		optionsArr.push(Option('user', 'Your Comments ('+tracker.userCommentIds.length+')'));
	}
	if(tracker.userFlaggedCommentIds.length){
		optionsArr.push(Option('flagged', 'Flagged Comments ('+tracker.userFlaggedCommentIds.length+')'));
	}

	for (var option of optionsArr) {
		$filterSelect.append(option.toHTML());
	}
	

	
	$filterSelect.val(setValue || "community");
	
	return $filterSelect;
}
// 0.0.1.8 Old name onKinjamproveUserInfoButtonClick
function setKinjamproveUserInfo() {
	var followedAuthorIds = {};

	kinjamprove.loggedIn = kinjamprove.accountState.id ? true : false;
	kinjamprove.lastUpdateTime = Date.now();

	// 0.0.1.8 Fix for when not logged in
	if(kinjamprove.accountState.followedAuthorIds){
		followedAuthorIds = kinjamprove.accountState.followedAuthorIds;
		kinjamprove.accountState.followedAuthorIds = { };
		
		for (var id of followedAuthorIds) {
			kinjamprove.accountState.followedAuthorIds[id] = 1;
		}
	}else{
		kinjamprove.accountState.followedAuthorIds = { };
	}
	//console.log('kinjamprove:', kinjamprove);
}
// 0.0.1.8 Added delays for quick changes and filtering or sorting.
function onSortOrderSelectChange() {
	//var trackerLabel = 'Sort - ' + this.value;
	//trackEvent('Sort Order', 'change', trackerLabel);
	
	var postId = Number.parseInt(this.attributes['postid'].value),
		commentTracker = kinjamprove.commentTrackers[postId],
		currentTime = Date.now(),
		_this = this,
		justSorting = true;
		
	if(commentTracker.waitOnSort){
		return;
	}
	
	
	if(currentTime - commentTracker.lastChangeTime < 300 || commentTracker.stillSorting || commentTracker.stillFiltering){
		commentTracker.waitOnSort = true;
		
		var doneSorting = setInterval(function() {
			if(!(commentTracker.stillSorting || commentTracker.stillFiltering)){
				clearInterval(doneSorting);
				commentTracker.waitOnSort = false;
				commenTracker.hasBeenSorted = {staff: false, liked: false, user: false, flagged: false, followed: false, curated: false, community: false};
				
				let sort = _this.value;
				
				commentTracker.reorderCommentsOnSortChange(sort, justSorting);
				chrome.storage.sync.set({ 'sortOrder': sort, }, function() {
					console.log('Kinjamprove: saving new sort choice to storage: "' + sort + '"');
					kinjamprove.options.sortOrder = sort;
				});
				commentTracker.lastChangeTime = Date.now();
			}
		}, 50);
	}else{
		let sort = _this.value;
		commentTracker.hasBeenSorted = {staff: false, liked: false, user: false, flagged: false, followed: false, curated: false, community: false};
		commentTracker.lastChangeTime = currentTime;
		commentTracker.reorderCommentsOnSortChange(sort, justSorting);
		chrome.storage.sync.set({ 'sortOrder': sort, }, function() {
			console.log('Kinjamprove: saving new sort choice to storage: "' + sort + '"');
			kinjamprove.options.sortOrder = sort;
		});	
	}
}

function createHidePendingCommentsToggleSwitch(numOfPendingComments) {
	var hidePendingCommentsCheckboxObj = { 
			type: 'checkbox', 
			'class': 'kinjamprove-hide-pending-comments-checkbox' 
		},
		$hidePendingCommentsCheckbox = $('<input>', hidePendingCommentsCheckboxObj)
			.change(onHidePendingCommentsToggleSwitchChange),
		$hidePendingCommentsCheckboxSlider = $('<span>', { 'class': 'slider kinjamprove-hide-pending-comments-slider' , 'title': 'Pending Comments Toggle'}),
		$hidePendingCommentsToggleSwitch = 
			$('<label>', { 'class': 'switch kinjamprove-hide-pending-comments-switch' })
				.append($hidePendingCommentsCheckbox, $hidePendingCommentsCheckboxSlider),
		$hidePendingCommentsTextSpan = 
			createElement('span', { 'class': 'kinjamprove-hide-pending-comments-span' }, 'Show Pending ('+numOfPendingComments+')'), 
		$hidePendingCommentsDiv = $('<div>',  { 'class': 'kinjamprove-hide-pending-comments-div' })
			.append($hidePendingCommentsTextSpan, $hidePendingCommentsToggleSwitch);

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
		hidePendingReplies = !checked,
		tracker = kinjamprove.commentTrackers[starterId],
		activeFilter = tracker.$kinjamproveFilterSelect.val();
		
	tracker.hidePending = hidePendingReplies;
	
	//trackEvent('Pending Replies', 'hide', hidePendingReplies+'')
		
	chrome.storage.sync.set({ 'hidePendingReplies': hidePendingReplies }, function() {
		//console.log('saving choice to storage: hidePendingReplies: "' + hidePendingReplies + '"');
		kinjamprove.options.hidePendingReplies = hidePendingReplies;
	});
	
	if(hidePendingReplies){
		tracker.userUnhiddenArticleMap.forEach(function(value, key, map){
			if(value[1] == 'li.kinjamprove-unapproved'){
				map.delete(key);
			}else if(value[1] == 'li'){
				value[1] = 'li:not(.kinjamprove-unapproved)';
			}
		});
		tracker.filterDiscussion(activeFilter);
	} else{
		if(activeFilter == "community"){
			tracker.filterDiscussion(activeFilter);
		}
	}
}

function createBackToTopButton() {
	var backToTopButton = createElement('button', { 'class': 'kinjamprove-return-to-top-button' }, 'Back to Top of Page');
	backToTopButton.addEventListener('click', function() {
		window.scrollTo(0, 0);
	});

	return backToTopButton;
}
function addNavButtons($elem) {
	var $backToTopButton = 
		$('<button>', { 'class': 'kinjamprove-return-to-top-button' })
			.text('To top of article')
			.click(function() {
				window.scrollTo(0, 0);
			});

	var backToTopDiscussionRegionButton = createElement('button', { 'class': 'kinjamprove-back-to-discussion-region-top' }, 'To top of comments');

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
						//console.log(i, $discussionRegion);
						$discussionRegion = $($discussionRegions[i-1]);
						break;
					}
				}
		}

		$('html, body').animate({
			scrollTop: $discussionRegion.offset().top + 'px'
		}, 'fast');   
	});

					
	$elem.prepend($(backToTopDiscussionRegionButton));
	$elem.prepend($backToTopButton);
}

//0.0.1.8
function mustBeLoggedIn(){
	alert("You must be logged in to perform this action. If you have just logged in, please refresh the page.");
}
//0.0.1.8 Added handling for when not logged in, new event handlers
function addDiscussionRegionEvents($discussionRegion, postId) {
	var parentCommentLinkEventsObj = {
			mouseover: onParentCommentLinkMouseOver,
			mouseout:  onParentCommentLinkMouseOut, 
			click: onParentCommentLinkClick 
		},
		articleEventsObj = { 
			mouseover: function showCollapseThreadButton() {
				$(this).find('a.kinjamprove-collapse-thread-button').show();
			},
			mouseout: function hideCollapseThreadButton() {
				$(this).find('a.kinjamprove-collapse-thread-button').hide();
			},
			dblclick: articleClickMark
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
		//0.0.1.8
		followForUserListItemEventsObj = !kinjamprove.loggedIn ? { click: mustBeLoggedIn } : {
			click: onFollowLiClick
		},
		unfollowForUserListItemEventsObj = !kinjamprove.loggedIn ? { click: mustBeLoggedIn } : {
			click: onUnfollowLiClick
		},
		flagPostListItemEventsObj = !kinjamprove.loggedIn ? { click: mustBeLoggedIn } : {
			click: onFlagLiClick
		},
		unflagPostListItemEventsObj = !kinjamprove.loggedIn ? { click: mustBeLoggedIn } : {
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
		replyLinkEventsObj = !kinjamprove.loggedIn ? { click: mustBeLoggedIn } : {
			click: onReplyLinkClick
		},
		kinjamproveReplyButtonEventsObj = !kinjamprove.loggedIn ? { click: mustBeLoggedIn } : {
			click: function() {
				//console.log('kinjamproveReplyButtonEventsObj:', this);

				var $discussionRegion = $(this).closest('.js_discussion-region'),
					$storyArticle = $discussionRegion.siblings('section.branch-wrapper').find('article.post'),
					starterId = Number.parseInt($storyArticle.attr('data-id'));

			    if (!commentEditorAPI) {
			        commentEditorAPI = new CommentEditorAPI();
			    } else {
			    	commentEditorAPI.$discussionRegion = $discussionRegion;
			    }

			    commentEditorAPI.attachEditorToComment(starterId, 'reply');
			}
		},
		likeButtonEventsObj = !kinjamprove.loggedIn ? { click: mustBeLoggedIn } : {
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
				//console.log('onKinjamproveReloadButtonClick; this:', this, event);
				//trackEvent('Button', 'click', 'Reload Comments');
				
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
		};
		
		
	var discussionRegionEventsMap = {
		'a.parent-comment-link': parentCommentLinkEventsObj,
		'article': articleEventsObj,
		'a.kinjamprove-collapse-thread-button': collapseThreadButtonEventsObj,
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
		'button.kinjamprove-reload-button': kinjamproveReloadButtonEventsObj,
		'a.kinjamprove-show-comment-replies-a': {click: showHiddenReplies}
	};

	for (var delegateSelector in discussionRegionEventsMap) {
		var delegateEvents = discussionRegionEventsMap[delegateSelector];
		$discussionRegion.on(delegateEvents, delegateSelector);
	}
	// Get rid of default Kinja show more comments button.
	$discussionRegion.removeClass('discussion-region--truncated--staff discussion-region--truncated discussion-region--truncated--default');
	$discussionRegion.children().children('div.js_cutoff').addClass('hide');
	
}
// 0.0.1.8 Filter select change event.
function onDiscussionFilterSelectChange() {
	var postId = Number.parseInt(this.attributes['postid'].value),
		commentTracker = kinjamprove.commentTrackers[postId],
		currentTime = Date.now(),
		_this = this;
		
	if(commentTracker.waitOnFilter){
		return;
	}
	
	commentTracker.loadedThreads.clear();
	commentTracker.totalVisible ={all: 0, staff: 0, pending: 0, approved: 0, user: 0, flagged: 0, liked: 0, followed: 0, curated: 0};
	commentTracker.userUnhiddenArticleMap.clear();
	
	if(currentTime - commentTracker.lastChangeTime < 300 || commentTracker.stillFiltering || commentTracker.stillSorting){
		commentTracker.waitOnFilter = true;
		
		var doneFiltering = setInterval(function() {
			if(!(commentTracker.stillFiltering || commentTracker.stillSorting)){
				clearInterval(doneFiltering);
				commentTracker.waitOnFilter = false;
				commentTracker.stillFiltering = true;

				commentTracker.reorderCommentsOnSortChange(kinjamprove.options.sortOrder);
				
				commentTracker.stillFiltering = false;
				commentTracker.lastChangeTime = Date.now();
			}
		}, 50);
	}else{
		commentTracker.stillFiltering = true;
		
		commentTracker.lastChangeTime = currentTime;
		commentTracker.reorderCommentsOnSortChange(kinjamprove.options.sortOrder);

		commentTracker.stillFiltering = false;
	}
}

function onCollapseThreadButtonClick(event) {
	// console.log('onCollapseThreadButtonClick; event:', event);
	//trackEvent('Button', 'click', event.currentTarget.title);

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
	
	let tracker = kinjamprove.commentTrackers[Utilities.getStarterIdOfFirstStory()];

	if (tracker.userIsStaff) {
		$dropdown.attr('data-kinjamprove-dismissible', 'true')
			.children('li.kinjamprove-dismiss-post').removeClass('hide');
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
	//trackEvent('Button', 'click', 'Parent Comment Link');
	event.stopPropagation();
	console.log(event);
	let $link = $(event.currentTarget),
		starterId = parseInt($link.attr('starter-id')),
		parentId = parseInt($link.attr('parent-id')),
		commentTracker = kinjamprove.commentTrackers[starterId],
		$li = commentTracker.commentLis[parentId];
	
	window.scrollTo( {top: $li.offset().top, behavior: 'smooth'});
    $('nav.js_top-nav').removeClass('shown fixed global-nav--scrollback');
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

// 0.0.1.8 Highlight on click.
function articleClickMark(event){
	let $this = $(this),
		$target = $(event.target);
	if($target.is('a') || $target.closest('ul').hasClass('kinjamprove-comment-dropdown')){
		return;
	}
	$this.toggleClass('kinjamprove-marked-comment');
}

// 0.0.1.8 Show hidden replies on click.
function showHiddenReplies(event){
	event.preventDefault(); 
	event.stopPropagation(); 
	let $this = $(this),
		starterId = parseInt($this.attr('starterid')),
		tracker = kinjamprove.commentTrackers[starterId],
		commentId = parseInt($this.attr('data-id')),
		$article = $this.parent().parent(),
		selector = 'li';
	
	
	$this.addClass('hide-show-replies-link');	
	
	if($this.hasClass('kinjamprove-show-replies-approved-link')){
		selector += ':not(.kinjamprove-unapproved)';
		if($this.siblings('.kinjamprove-show-replies-pending-link:not(.hide-show-replies-link)').length){
			$this.siblings('.kinjamprove-show-replies-all-link').addClass('hide-show-replies-link');
		}else{
			$this.parent().addClass('hide-show-replies');
		}
	}else if($this.hasClass('kinjamprove-show-replies-pending-link')){
		selector += '.kinjamprove-unapproved';
		if($this.siblings('.kinjamprove-show-replies-approved-link:not(.hide-show-replies-link)').length){
			$this.siblings('.kinjamprove-show-replies-all-link').addClass('hide-show-replies-link');
		}else{
			$this.parent().addClass('hide-show-replies');
		}
	}else{
		$this.parent().addClass('hide-show-replies');
	}

	$article.siblings(selector).removeClass('hide').show();

	tracker.userUnhiddenArticleMap.set(commentId, [$article, selector]);
}

// 0.0.1.8 Update show hidden comment links
function updateCommentRepliesDiv($article, id, tracker){
	let $showRepliesDiv = $article.find('div.kinjamprove-show-comment-replies-div'),
		numObj = tracker.countHiddenDirectRepliesToComment(id, tracker.$kinjamproveFilterSelect.val() != "community");
	
	if(numObj.approved || numObj.pending){
		let $showReplyLinks = $showRepliesDiv.find('a.kinjamprove-show-comment-replies-a');
		
		if(typeof(numObj.pending) !== 'undefined'){
			let $pendingRepliesLink = $showReplyLinks.siblings('a.kinjamprove-show-replies-pending-link');
			$pendingRepliesLink.text("Pending (" + numObj.pending + ") ");
			if(numObj.pending){
				$pendingRepliesLink.removeClass('hide-show-replies-link');
				$showRepliesDiv.removeClass('hide-show-replies');
			} else {
				$pendingRepliesLink.addClass('hide-show-replies-link');
			}
		}

		if(typeof(numObj.approved) !== 'undefined'){
			let $approvedRepliesLink = $showReplyLinks.siblings('a.kinjamprove-show-replies-approved-link');
			$approvedRepliesLink.text("Approved (" + numObj.approved + ") ");
			if(numObj.approved){
				$approvedRepliesLink.removeClass('hide-show-replies-link');
				$showRepliesDiv.removeClass('hide-show-replies');
			} else {
				$approvedRepliesLink.addClass('hide-show-replies-link');
			}
		} else {
			let $approvedRepliesLink = $showReplyLinks.siblings('a.kinjamprove-show-replies-approved-link');
			$approvedRepliesLink.addClass('hide-show-replies-link');
		}
		
		if(numObj.approved && numObj.pending) {
			let $allRepliesLink = $showReplyLinks.siblings('a.kinjamprove-show-replies-all-link');
			$allRepliesLink.text("All (" + (numObj.approved + numObj.pending) + ")");
			$allRepliesLink.removeClass('hide-show-replies-link');
		} else {
			$showReplyLinks.siblings('a.kinjamprove-show-replies-all-link').addClass('hide-show-replies-link');
		}
		
	} else {
		$showRepliesDiv.addClass('hide-show-replies');
	}
}

function getDiscussionRegionOfCurrentLocation() {
	var refId = Utilities.getRefIdFromURL(),
		$discussionRegion = $('section.js_discussion-region[starter-id="' + refId + '"]');

	return ($discussionRegion.length) ? $discussionRegion : $('section#js_discussion-region');
}

function createBackToTopOfDiscussionRegionButton() {
	var backToTopDiscussionRegionButton = createElement('button', { 'class': 'kinjamprove-back-to-discussion-region-top' }, 'To top of Comments');

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
				        //console.log(i, $discussionRegion);
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
/*
//0.0.1.8 Turned off
function trackEvent(category, action, label) {
	return;
	// console.log('trackEvent; event:', event);
	
	// if (arguments.length === 1) {
	// 	if (typeof arguments[0] === 'string') {
	// 		label = arguments[0];
	// 	} else {
	// 		event = arguments[0];
	// 		label = event.currentTarget.title || event.currentTarget.classList[0];
	// 	}
	// }
 0.0.1.8
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
*/
/* 0.0.1.8 Not used.
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
*/
/* Not used
function setBodyScrollIntervalEvent() {
	var $kinjamproveFooter = $('footer#kinjamprove-footer'),
		$viewAllButton;

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

		var scrollTop = window.scrollY;

		if (Math.abs(lastScrollTop - scrollTop) <= delta) {
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

}*/
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


// function addParentCommentLinkMouseEvents() {
	// var $parentCommentLinks = $('.parent-comment-link'); 
	
	// $parentCommentLinks.on({
		// 'mouseover': onParentCommentLinkMouseOver,
	    // 'mouseout': onParentCommentLinkMouseOut
	// });	
// }