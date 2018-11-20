function XhrCommentTracker(postId) {
	var $story = $('article#post_'+postId);
	this.postId = postId;
	this.staffScreenNames = { },
	this.staffCommentsMap = new Map();
	this.userComments = [];
	this.totalNumOfComments = undefined;
	this.numOfRequests = undefined;
	this.threadIndex = undefined;
	this.responseIndex = 0;
	this.commentsArr = [];
	this.$story = $story;
	//this.$discussionRegion = $('article[data-parent-id=' + postId + ']').closest('section.js_discussion-region'); 
	this.$discussionRegion = $story.closest('section.branch-wrapper').siblings('section.js_discussion-region'); 
	this.$contentRegion = undefined;
	this.$commentList = undefined;
	this.$loadMoreCommentsButton = undefined;
	this.finished = false;
	this.hidePending = undefined;
	this.userLikedCommentIds = { };
	this.userFlaggedCommentIds = { };
	// this.$nativeCommentList = undefined;

	if (!this.$discussionRegion.length) {
		this.$discussionRegion = undefined;
	}

	this.commentsMap = new Map();
	// this.commentsMap = { };

	this.$story = $('#post_' + this.postId);
	this.recentlyEditedCommentsMap = null;
}

XhrCommentTracker.numOfCommentsToLoadAtOnce = 50;

XhrCommentTracker.prototype = {
	constructor: XhrCommentTracker,

	get numOfCommentsToLoadAtOnce() {
		return this.constructor.numOfCommentsToLoadAtOnce;
	},

	set numOfCommentsToLoadAtOnce(numOfCommentsToLoadAtOnce) {
		this.constructor.numOfCommentsToLoadAtOnce = numOfCommentsToLoadAtOnce;
	},
	
	getLikesOfUserUnderStarter: function() {
		var url = Utilities.getLikesOfUserUnderStarterURL(this.postId),
			_this = this;
		
		// _this.userLikedCommentIds = {};
	
		return CommentPromiseFactory.getJSON(url).then(function(result) {
			console.log('liked comment IDs result:', result);

			var data = result.data;

			for (var i = 0; i < data.length; i++) {
				var id = data[i].objectId;
				_this.userLikedCommentIds[id] = 1;
				kinjamprove.userLikedPostIdsMap[id] = 1;
			}

			console.log('userLikedCommentIds:', _this.userLikedCommentIds);
		
			return _this;
		});
	},

	getFlagsOfUserUnderStarter: function() {
		var url = Utilities.getFlagsOfUserUnderStarterURL(this.postId),
			_this = this;
		
		// _this.userFlaggedCommentIds = {};
		
		return CommentPromiseFactory.getJSON(url).then(function(result) {
			console.log('flagged comment IDs result:', result);

			var data = result.data;

			for (var i = 0; i < data.length; i++) {
				var id = data[i].postId;
				_this.userFlaggedCommentIds[id] = 1;
				kinjamprove.userFlaggedPostIdsMap[id] = 1;
			}

			console.log('userFlaggedCommentIds:', _this.userFlaggedCommentIds);
			
			return _this;
		});
	},
	// 0.0.1.8 Fix for use while not logged in
	load: function(loggedIn = true) {
		var getUserLikesUnderStarterPromise = loggedIn ? this.getLikesOfUserUnderStarter() : new Promise(function(resolve, reject){}),
			getUserFlagsUnderStarterPromise = loggedIn ? this.getFlagsOfUserUnderStarter() : new Promise(function(resolve, reject){});
		
		
		return Promise.all([
			getUserLikesUnderStarterPromise, 
			getUserFlagsUnderStarterPromise,
			this.loadComments()
		]);
	},
	
	loadComments: function() {
		var getTotalNumOfCommentsUrl = 
				CommentApiURLFactory.getAPIBaseURLFromID(this.postId, 0, 1, 0, false),
			_this = this,
			items = [];
			
		CommentPromiseFactory.getArticleDataXhr(this.postId).then(function(response) {
			console.log('Total # of comments: ', response);
			console.log('this:', _this);
			return response;
		})
		.then(async function getThreadPromises(response) {
			var promises = [], 
			    totalNumOfComments = response.replyCount,
			    numOfCommentsRemaining = totalNumOfComments,
			  	numOfRequests = getNecessaryNumberOfRequestsForAllComments(totalNumOfComments),
			  	currentIndex = 0,
			  	articleId = _this.postId,
				authorScreenName = response.author.screenName;
			  
			_this.staffScreenNames = response.staffScreenNames;
			_this.staffCommentsMap = await CommentPromiseFactory.getCuratedListDataXhr(authorScreenName, articleId);

			while (numOfCommentsRemaining > 0) {
				var url = CommentApiURLFactory.getAPIBaseURLFromID(articleId, currentIndex, 100, 500, false),
					promise = CommentPromiseFactory.getItemsPromise(url); 		

				//console.log(promise);

				promises.push(promise);

				currentIndex += 100;
				numOfCommentsRemaining -= 100;
			}

			return promises;
		}).then(function sortItemsByHighestPaginationTotal(promises) {
			items = [];
			
		  	return Promise.all(promises).then(function(responses) {
				console.log('responses:', responses);

				responses.forEach(function(response) {
				  items.push(...response);
				});

				items.sort(function(a, b) {
				  return b.children.pagination.curr.total - a.children.pagination.curr.total;
				});

				console.log('items1:', items);

				return items;
		  });
		}).then(function getFlatReplies(items) {
			var promises = [];
			console.log('items2:', items);

			for (var i = 0; i < items.length; i++) {
				var item = items[i],
					children = item.children,
					pagination = children.pagination,
					baseCommentId = item.reply.id;

				if (typeof pagination.next === 'undefined') {
					break;
				}

				var total = pagination.next.total,
					startIndex = 100,
					remaining = total - startIndex,
					numOfRequestsRemaining = getNecessaryNumberOfRequestsForAllComments(remaining),
					flatRepliesUrl = CommentApiURLFactory.getFlatRepliesUrlForComment(baseCommentId, startIndex, false);

				console.log('total:' + total + ', remaining:' + remaining + ', numOfRequestsRemaining=' + numOfRequestsRemaining);

				while (numOfRequestsRemaining > 0) {
					console.log('nextStartIndex='+startIndex);

					var url = flatRepliesUrl.replace(/(\?startIndex=)[0-9]*/, '$1'+startIndex),
						promise = CommentPromiseFactory.getFlatRepliesXhr(url);

					promises.push(promise);

					startIndex += 100;
					numOfRequestsRemaining--;
			   } 
			}

		  return Promise.all(promises);
		})
		.then(function addFlatReplies(flatReplies) {
		   var lastIndex = 0;
   
			for (var i = 0; i < flatReplies.length; i++) {
				var replyId = flatReplies[i].reply.id;

				for (var j = lastIndex; j < items.length; j++) {
					if (items[j].reply.id === replyId) {
						items[j].children.items.push(...flatReplies[i].children.items);
						lastIndex = j;
						break;
					}
				}  
			}
  
		   console.log('items3:', items);

		   return items;
		   
		}).then(function setCommentsAndFinish(items) {
			_this.totalNumOfComments = 0;

			for (var i = 0; i < items.length; i++) {
				var item = items[i], 
					baseComment = item.reply,
					baseCommentReplies = item.children.items;

				if (_this.recentlyEditedCommentsMap && 
						_this.recentlyEditedCommentsMap.hasOwnProperty(baseComment.id)) {
					baseComment.body = _this.recentlyEditedCommentsMap[baseComment.id].body;
				} 

				baseComment.depth = 0;
				baseComment.newest = baseCommentReplies.length 
					? baseCommentReplies[baseCommentReplies.length-1].publishTimeMillis
					: baseComment.publishTimeMillis;
				baseComment.replies = [];
				baseComment = new Comment(baseComment);

				_this.commentsMap.set(baseComment.id, baseComment);
				

				for (var j = 0; j < baseCommentReplies.length; j++) {
					var reply = baseCommentReplies[j],
						replyId = reply.id,
						parentId = reply.parentId,
						replyParent = _this.commentsMap.get(parentId),
						screenName;

					reply.author = reply.author || { screenName: '' };
					screenName = reply.author ? reply.author.screenName : '';
											
					reply.authorIsStaff = _this.staffScreenNames.hasOwnProperty(screenName);
					if (_this.staffCommentsMap.has(replyId.toString())) {
						reply.curatedReply = true;
						reply.directReplyCount = _this.staffCommentsMap.get(replyId.toString());
					}

					if (_this.recentlyEditedCommentsMap && 
							_this.recentlyEditedCommentsMap.hasOwnProperty(reply.id)) {
						reply.body = _this.recentlyEditedCommentsMap[reply.id].body;
					}

					reply.depth = replyParent.depth + 1;
					reply.replies = [];
					reply = new Comment(reply);
				
					replyParent.replies.push(reply);

					_this.commentsMap.set(reply.id, reply);
					// _this.commentsMap[replyId] = reply;
				}
				
				baseComment.authorIsStaff = (baseComment.author && _this.staffScreenNames.hasOwnProperty(baseComment.author.screenName));
				if (_this.staffCommentsMap.has(baseComment.id.toString())) {
					baseComment.curatedReply = true;
					baseComment.directReplyCount = _this.staffCommentsMap.get(baseComment.id.toString());
				}
					
				// baseComment = new Comment(baseComment, 0);
				baseComment.numOfDescendants = baseCommentReplies.length;
				// baseComment.setReplies(baseCommentReplies);
				// baseComment.setNewest();
				baseComment.setMaxThreadLikes();
				_this.commentsArr.push(baseComment);

				// _this.commentsMap.set(baseComment.id, baseComment);
				// _this.commentsMap[baseComment.id] = baseComment;
				_this.totalNumOfComments += 1 + baseCommentReplies.length;
			}

		  console.log('_this: ', _this);
		  console.log('_this.commentsArr:', _this.commentsArr);
		  console.log('_this.staffScreenNames:', _this.staffScreenNames);
		  console.log('_this.staffCommentsMap:', _this.staffCommentsMap);
		  _this.sortComments(kinjamprove.options.sortOrder);
		  _this.finished = true;
		  
		  var $contentRegion = _this.$discussionRegion.find('div.js_content-region');
		  if ($contentRegion.length) {
		  	console.log('AFTER FINISHING LOADING COMMENTS, $contentRegion:', $contentRegion);
		  	_this.contentRegionAdded($contentRegion);
		  }
		
		  return _this;
		});

	},
	
	createKinjamproveLoadMoreCommentsButton: function() {
		var kinjamproveLoadMoreCommentsButtonObj = { 'class': 'kinjamprove-loadMoreCommentsButton' };
		var $kinjamproveLoadMoreCommentsButton = 
			$('<button>', kinjamproveLoadMoreCommentsButtonObj)
				.text('Load more comments');
		var _this = this;
		
		$kinjamproveLoadMoreCommentsButton.click(function() {
			var thereAreNoMoreCommentsRemainingToShow;
			
			console.log('kinjamprove load more comments button clicked: ', _this);
			_this.displayMoreComments();

			thereAreNoMoreCommentsRemainingToShow = 
				(_this.totalNumOfComments <= _this.numOfCommentsToLoadAtOnce || 
					(
						_this.threadIndex >= _this.commentsArr.length && 
						!_this.$discussionRegion.find('article[kinjamprove-hidden]').length
					)
				);
				
			if (thereAreNoMoreCommentsRemainingToShow) {
				$(this).hide();
				_this.$discussionRegion.find('button.kinjamprove-loadMoreCommentsButton').hide();
				console.log('HIDING kinjamprove Load More Comments button');
			} 
		});

		if (!isNaN(this.totalNumOfComments) && this.totalNumOfComments <= this.numOfCommentsToLoadAtOnce) {
			$kinjamproveLoadMoreCommentsButton
				.closest('.js_discussion-region')
					.find('button.kinjamprove-loadMoreCommentsButton')
						.hide();
			// this.$discussionRegion.find('button.kinjamprove-loadMoreCommentsButton').hide();
		}
				
		this.$kinjamproveLoadMoreCommentsButton = $kinjamproveLoadMoreCommentsButton;

		return $kinjamproveLoadMoreCommentsButton;
	},

	
	
	displayMoreComments: function(numOfComments) {
		numOfComments = numOfComments || this.numOfCommentsToLoadAtOnce;

		console.log('inside displayMoreComments()');
		
		if (!this.$discussionRegion) {
			this.setDiscussionRegion();
		}
		if (!this.$commentList) {
			this.setUnorderedList();
			this.$commentList.show();
		}
		
		this.$commentList.detach();

		var $liArr = [],
			commentCount = 0,
			commentsArrLength = this.commentsArr.length,
			// $comments = this.$commentList.find('article:not(".collapsed")'),
			// $kinjamproveHiddenComments = $comments.filter('article[kinjamprove-hidden]:lt('+ numOfComments+')'); 
			$nonCollapsedComments = this.$commentList.find('article:not(li.collapsed article)'),
			$nextHiddenCommentsToDisplay = $nonCollapsedComments.filter('article[kinjamprove-hidden]:lt('+numOfComments+')'),
			$staffTab = this.$discussionRegion.find('a[value="staff"]'),
			staffTabActive = $staffTab.hasClass('tab-item--active');
		
		console.log('$nextHiddenCommentsToDisplay:', $nextHiddenCommentsToDisplay);

		var docFrag = document.createDocumentFragment();

		if ($nextHiddenCommentsToDisplay.length) {
			commentCount += $nextHiddenCommentsToDisplay.length;
			$nextHiddenCommentsToDisplay.removeAttr('kinjamprove-hidden').show();
		}

		while (commentCount < numOfComments && this.threadIndex < commentsArrLength) {
			var comment = this.commentsArr[this.threadIndex++],
				commentId = comment.id,
				remainingRoom = numOfComments - commentCount,
				$li;

			if (comment.sort === 'newest' && !comment.newestSet) {
				comment.setNewest();
			}

			comment.sortReplies();
			$li = createNestedCommentsListItem(comment);
			
			$li.find('article:gt(' + remainingRoom + ')').attr('kinjamprove-hidden', 'true').hide();
			// $liArr.push($li);

			docFrag.appendChild($li[0]);

			commentCount += comment.numOfDescendants + 1;
			console.log('remainingRoom='+remainingRoom);
		}
				
		console.log('commentCount=' + commentCount);

		// this.$commentList.append($liArr);
		this.$commentList.append(docFrag);
		// 0.0.1.8
		if (kinjamprove.options.hidePendingReplies) {
			this.$commentList
				.find('article.reply--unapproved:not(.kinjamprove-followedUser, .kinjamprove-user-comment)')
				.addClass('kinjamprove-unapproved')
				.parent()
				.addClass('kinjamprove-unapproved hide')
				.hide();			
		}
		
		if (staffTabActive){
			this.$commentList
				.find('article.reply')
				.parent()
				.hide();
			this.$commentList
				.find('article.kinjamprove-curated')
				.parent()
				.show();
		}

		// this.threadIndex = threadIndex;
		this.$discussionRegion.find('div.js_content-region').prepend(this.$commentList);
		
		console.log('this.$commentList:', this.$commentList);


		var numOfVisibleComments = this.$commentList.find('article').length,
			numOfCommentsRemainingToDisplay = this.totalNumOfComments - numOfVisibleComments;
		
		console.log('this.totalNumOfComments=', this.totalNumOfComments, 
			'numOfVisibleComments=', numOfVisibleComments, 
			'numOfCommentsRemainingToDisplay=', numOfCommentsRemainingToDisplay);
		
		this.$discussionRegion.attr('kinjamprove-display-comments-remaining', numOfCommentsRemainingToDisplay);
	},
	// 0.0.1.8
	getPendingComments: function() {
		var pendingCommentsSelector = 'article.reply--unapproved:not(.kinjamprove-followedUser, .kinjamprove-user-comment, [kinjamprove-hidden])',
			$pendingComments = this.$commentList.find(pendingCommentsSelector);
		
		return $pendingComments;
	},

	showPendingComments: function() {
		this.getPendingComments().parent().removeClass('hide').show();
	},
	
	hidePendingComments: function() {
		this.getPendingComments().parent().addClass('hide').hide();
	},

	reorderCommentsOnSortChange: function(sort) {
		console.time('reorderCommentsOnSortChange');
		console.log('reorderCommentsOnSortChange sort=' + sort);
		this.sortComments(sort);
		this.threadIndex = 0;
		this.removeListItemsFromUnorderedList();
		this.displayMoreComments();
		// 0.0.1.8 Make sure pending comments toggle is honored.
		if(kinjamprove.options.hidePendingReplies){
			this.hidePendingComments();
		}
		
		if (this.totalNumOfComments > this.numOfCommentsToLoadAtOnce) {
			this.$kinjamproveLoadMoreCommentsButton.show();
		}
		console.timeEnd('reorderCommentsOnSortChange');
		console.log('after reorderCommentsOnSortChange this:', this);
	},

	removeListItemsFromUnorderedList: function() {
		if (!this.$commentList || !this.$commentList.length) {
			this.setDiscussionRegion();
			this.setUnorderedList();
		}
		if (this.$commentList) {
			this.$commentList.detach();
			this.$commentList.children('li').remove();
			this.$contentRegion.append(this.$commentList);
		}
		
	},

	setDiscussionRegion: function($discussionRegion) {
		if (!arguments.length) {
			if (this.$discussionRegion && this.$discussionRegion.length) {
				return true;
			}

			var $branchWrapper = $('article[data-id=' + this.postId + ']').closest('.branch-wrapper')

			$discussionRegion = $branchWrapper.siblings('.js_discussion-region');

		 	// $discussionRegion.attr('kinjamprove', 'on');
		}

		if (!$discussionRegion.length) {
			$discussionRegion = undefined;		
		} 

		this.$discussionRegion = $discussionRegion;

		return !!this.$discussionRegion;
	},

	setContentRegion: function($contentRegion) {
		if (!arguments.length) {
			if (this.$contentRegion && this.$contentRegion.length) {
				return true;
			}
			if (!this.setDiscussionRegion()) {
				return false;
			}

			$contentRegion = (this.$discussionRegion && this.$discussionRegion.length) 
				? this.$discussionRegion.find('div.js_content-region:first') 
				: undefined;
		}

		this.$contentRegion = ($contentRegion && $contentRegion.length) 
			? $contentRegion 
			: undefined;

		return !!this.$contentRegion;
	},

	setUnorderedList: function($commentList) {
		if (!arguments.length) {
			if (!this.setContentRegion()) {
				return false;
			}
			
			$commentList = this.$contentRegion 
				? this.$contentRegion.find('ul.commentlist:first') 
				: undefined;
		}

		this.$commentList = ($commentList && $commentList.length) ? $commentList : undefined;

		console.log('set this.$commentList to:', this.$commentList);

		return !!this.$commentList;
	},

	getThreadFromReplyId: function(replyId) {
		var reply = this.commentsMap.get(replyId);

		if (!reply) {
			return null;
		}

		var parentId = reply.parentId;

		while (reply && reply.parentId && reply.parentId !== this.postId) {
			reply = this.commentsMap.get(reply.parentId)
		}

		return reply;
	},


	sortComments: function(sort) {
		var sortMethod;
		console.log('sortComments method called w/ sort="' + sort + '"');
		console.log('this.commentsArr: ', this.commentsArr);

		switch(sort) {
			// case 'popular':
				// sortMethod = sortRepliesMostPopularFirst; 
				// break;
			case 'newest':
				sortMethod = sortThreadsNewestFirst;
				break;
			case 'oldest':
				sortMethod = sortThreadsOldestFirst; 
				break;
			case 'likes': 
				sortMethod = sortThreadsMostLikedFirst;
				break;
			case 'replies':
				sortMethod = sortThreadsMostRepliesFirst;
				break;
			default:  
				sortMethod = sortThreadsMostLikedFirst;
				//sortMethod = sortThreadsMostRepliesFirst;
		}

		Comment.sort = sort;
		// this.commentsArr[0].sort = sort;
		this.commentsArr.sort(sortMethod);

		if (this.referralId && this.referralId !== this.postId) {
			this.moveCommentToTop(this.referralId);	
		}

	
		function sortThreadsOldestFirst(threadA, threadB) {
			return threadA.publishTimeMillis - threadB.publishTimeMillis;
		}
		function sortThreadsNewestFirst(threadA, threadB) {
			return threadB.newest - threadA.newest;
		}
		function sortThreadsMostRepliesFirst(threadA, threadB) {
			if (threadA.replyCount !== threadB.replyCount) {
				return threadB.replyCount - threadA.replyCount;
			} else if (threadA.likes !== threadB.likes) {
				return threadB.likes - threadA.likes;
			} else {
				return threadA.publishTimeMillis - threadB.publishTimeMillis;
			}
		}
		function sortThreadsMostLikedFirst(threadA, threadB) {     
			if (threadA.maxThreadLikes !== threadB.maxThreadLikes) {
				return threadB.maxThreadLikes - threadA.maxThreadLikes;
			} else if (threadA.replyCount !== threadB.replyCount) {
				return threadB.replyCount - threadA.replyCount;
			} else {
				return threadA.publishTimeMillis - threadB.publishTimeMillis;
			}
		}
		
	}, // end of sortComments

	moveCommentToTop(commentId) {
		var thread = this.getThreadFromReplyId(commentId);
		var comment = this.commentsMap.get(commentId);

		console.log('REFERALL THREAD:', thread, 
			'REFERRAL COMMENT:', comment);
		
		var threadIndex = null;

		threadIndex = this.commentsArr.findIndex(function(comment) {
			return comment.id === thread.id;
		});

		if (threadIndex > 0) {
			var tempCommentsArr = [].concat(
					this.commentsArr.slice(threadIndex, threadIndex+1),
					this.commentsArr.slice(0, threadIndex),
					this.commentsArr.slice(threadIndex+1)
				);

			this.commentsArr = tempCommentsArr;
		}

		var parentComment = this.commentsMap.get(comment.parentId);
		while (parentComment && parentComment.parentId) { 			
			var siblingComments = parentComment.replies;
			var siblingIndex = siblingComments.findIndex(function(sibling) {
				console.log('sibling.id='+sibling.id, 'comment.id='+comment.id);
				return sibling.id === comment.id;
			});

			if (siblingIndex >= 0) {
				var tempSiblings = [].concat(
					siblingComments.slice(siblingIndex, siblingIndex+1),
					siblingComments.slice(0, siblingIndex),
					siblingComments.slice(siblingIndex+1)
				);

				var temp = this.commentsMap.get(parentComment.id);
				parentComment.replies = tempSiblings;
				this.commentsMap.set(parentComment.id, parentComment);
				// parentComment.replies = siblingComments;
			}

			console.log('siblingIndex='+siblingIndex, 'comment=', comment, 'parentComment=', parentComment, 'siblings=', tempSiblings);
		
			for (var i = 0; i < parentComment.replies.length; i++) {
				console.log('sibling['+i+'].id='+parentComment.replies[i].id);
			}

			parentComment = this.commentsMap.get(parentComment.parentId);
		}
	},

	reloadDiscussionRegion() {
		var _this = this,
			oldThis = {
				commentsArr: _this.commentsArr,
				threadIndex: _this.threadIndex,
				responseIndex: _this.responseIndex
			};
		this.finished = false;
		this.threadIndex = 0;
		this.responseIndex = 0;
		this.commentsArr = [];
		return this.loadComments()
		// .then(function(response) {
			// console.log('reloadDiscussionRegion response:', response);
		// });
	},

	contentRegionAdded($contentRegion) {
		$contentRegion = $contentRegion[0] ? $contentRegion : $($contentRegion);

		var kinjamproveSpinnerBounce = createKinjamproveSpinnerBounce();
		

		this.setContentRegion($contentRegion);
		this.$discussionRegion.find('.spinner.bounce').remove();
		this.$discussionRegion.attr('starter-id', this.postId);
		this.$contentRegion.before(kinjamproveSpinnerBounce);
		this.$contentRegion.hide();
		
		var commentTracker = this;
		
		// $reloadButton.hide();

		setTimeout(function() {				
			var timeElapsedTicks = 0;
			var commentTrackerFinished = setInterval(function() {
				console.log('waiting for commentTracker to finish for post id #' + commentTracker.postId + '... ' + timeElapsedTicks + ' (kinjamprove.commentTrackers: ', kinjamprove.commentTrackers);
				
				if (commentTracker && commentTracker.finished) {
					console.log('emptying contentRegion:', $contentRegion);
					commentTracker.$discussionRegion.find('span.spinner').hide();

					// $(kinjamproveSpinnerBounce).hide();

					commentTracker.$contentRegion.empty();
					commentTracker.$discussionRegion.attr('staff-names', Object.keys(commentTracker.staffScreenNames).join(','));

					if (!commentTracker.$commentList || !commentTracker.$commentList.length) {
						commentTracker.$commentList = createUnorderedCommentList();
					}
					commentTracker.createKinjamproveLoadMoreCommentsButton();
					commentTracker.$contentRegion.append(commentTracker.$kinjamproveLoadMoreCommentsButton);
					commentTracker.reorderCommentsOnSortChange(kinjamprove.options.sortOrder);
					commentTracker.$contentRegion.show();

					console.log("commentTracker.$discussionRegion.find('button.kinjamprove-reload-button'):", commentTracker.$discussionRegion.find('button.kinjamprove-reload-button'));
					// $reloadButton.show();//.css('display', 'block');

					clearInterval(commentTrackerFinished);

					var $reloadButton = commentTracker.$discussionRegion.find('button.kinjamprove-reload-button');
					
					if (!$reloadButton.length) {
						$reloadButton = createKinjamproveReloadButton(commentTracker.$discussionRegion);
						commentTracker.$discussionRegion.find('div.kinjamprove-discussion-header-panel').after($reloadButton);
					} else {
						$reloadButton.show();
					}

					/*
					*	vvv FOR DEBUGGING ONLY: Adding commentsArr to DOM vvv
					*/
					// var commentsArrStr = JSON.stringify(commentTracker.commentsArr);
		   //      	var $commentsArrContainer = createElement('input', { 'class': 'kinjamprove-comments-arr hide' , value: commentsArrStr });
		   //      	commentTracker.$discussionRegion.append($commentsArrContainer);

		        	/*
					*	^^^ FOR DEBUGGING ONLY: Adding commentsArr to DOM ^^^
					*/

					
				} else if (timeElapsedTicks >= 60) {
					clearInterval(commentTrackerFinished);
					commentTracker.$discussionRegion.find('.spinner.bounce').remove();
					// commentTracker.$discussionRegion.find('button.kinjamprove-reload-button').show();
					
					var $reloadButton = commentTracker.$discussionRegion.find('button.kinjamprove-reload-button');
					
					if (!$reloadButton.length) {
						$reloadButton = createKinjamproveReloadButton(commentTracker.$discussionRegion);
						commentTracker.$discussionRegion.find('div.kinjamprove-discussion-header-panel').after($reloadButton);
					} else {
						$reloadButton.show();
					}
				} 
				
				timeElapsedTicks++;
			}, 1000);			
		}, 1000);
	},



	collapseAllThreadsAtRoot() {
	    // $discussionRegion = $discussionRegion || $('#js_discussion-region');
	    
	    var $collapseThreadButtons = 
	    	this.$discussionRegion
				.find('article[depth=0] a.kinjamprove-collapse-thread-button.collapse');
	    
	    $.each($collapseThreadButtons, function() {
	    	this.click();
		});
	},

	expandAllThreadsAtRoot() {
	    // $discussionRegion = $discussionRegion || $('#js_discussion-region');
	    
	    var $expandThreadButtons = 
	    	this.$discussionRegion
				.find('article[depth=0] a.kinjamprove-collapse-thread-button:not(.collapse)');
	    
	    $.each($expandThreadButtons, function() {
	    	this.click();
		});
	},
};


function getNecessaryNumberOfRequestsForAllComments(numOfComments) {
	return (numOfComments % 100 === 0) 
		? numOfComments / 100
		: Number.parseInt(numOfComments/100) + 1;
}

function xhrPromiseGet(url) {
	// Return a new promise.
    return new Promise(function(resolve, reject) {
        // Do the usual XHR stuff
        var req = new XMLHttpRequest();
        req.open('GET', url);
        
        req.onload = function() {
            // This is called even on 404 etc.
            // so check the status
            if (req.status === 200) {
                // Resolve the promise w/ the response text
                resolve(req.response);
            } else {
                // Otherwise reject w/ the status text
                // which will hopefully be a meaningful error
                reject(Error(req.statusText));
            }
        };
        
        // Handle network errors
        req.onerror = function() {
            reject(Error('Network Error'));
        };
        
        // Make the request!
        req.send();
    });
}



function getStaffRepliesURL(staffMemberName, starterId, maxReturned, cacheIt) {
	starterId = starterId || getArticleIdOfCurrentPage();
	maxReturned = maxReturned || 100;
	cacheIt = cacheIt || true;
	
	// url = 'https://www.avclub.com/api/comments/views/curatedReplies/1798398429?query=seanoneal&maxReturned=5&cache=true&refId=1798521900';
    var origin = window.location.origin,
        staffRepliesPathname = '/api/comments/views/curatedReplies/' + 
			starterId + '?query=' + staffMemberName + 
			'&maxReturned=' + maxReturned + '&cache=' + cacheIt,
        staffRepliesURL = origin + staffRepliesPathname;
    
    return staffRepliesURL;
}

function getStaffMemberRepliesXhr(staffMemberName, starterId) {
	var url = getStaffRepliesURL(staffMemberName, starterId);

	return getJSON(url).then(
		function(response) {
			var items = response.data.items;
			return items;
  		});
}