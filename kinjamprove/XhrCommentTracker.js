function XhrCommentTracker(postId) {
	var $story = $('article#post_'+postId);
	this.postId = postId;
	
	this.threadMap = new Map();
	this.threadTypes = {staff: new Map(), liked: new Map(), user: new Map(), flagged: new Map(), followed: new Map(), curated: new Map(), community: this.threadMap, new: new Map()};
	this.loadedThreads = new Map();
	this.commentsMap = new Map();
	this.staffScreenNames = { };
	this.hasBeenSorted = {staff: false, liked: false, user: false, flagged: false, followed: false, curated: false, community: false, new: false};
	
	this.staffCommentIdsMap = new Map();
	this.approvedCommentIds = [];
	this.pendingCommentIds = [];
	this.userCommentIds = [];
	this.userFlaggedCommentIds = [];
	this.followedAuthorCommentIds = [];
	this.userLikedCommentIds = [];
	this.newCommentIds = [];
	
	this.commentsPerThread = new Map();
	this.totalVisible = {all: 0, staff: 0, pending: 0, approved: 0, user: 0, flagged: 0, liked: 0, followed: 0, curated: 0, new: 0};
	
	this.authorMap = new Map();
	this.authorNameMap = new Map();
	this.$authorDatalist;
	
	this.$story = $story;
	this.$discussionRegion = $story.closest('section.branch-wrapper').siblings('section.js_discussion-region'); 
	if (!this.$discussionRegion.length) {
		this.$discussionRegion = undefined;
	}
	this.$contentRegion = undefined;
	this.$kinjamproveFilterSelect = undefined;
	this.$commentList = undefined;

	this.commentLis = {};
	this.commentArticles = {};

	
	//Format: (commentId, [type, $article]) Type of replies: 0 = pending, 1 = approved, 2 = staff
	this.commentListArticlesDescendantMap = new Map();
	
	// Format: (commentId, [$article, selector])
	this.userUnhiddenArticleMap = new Map();

	this.notArticle = false;
	this.finished = false;
	this.hidePending = undefined;
	this.lastChangeTime = 0;
	
	this.userIsAuthor = false;
	this.userIsStaff = false;

	// 0.0.1.9 New post tracking
	this.newestPostTime = 0;
	this.lastNewestPostTime = 0;
	this.approvedNewPosts = 0;
	this.$newCommentsInfoSpan;
	this.$failedStaffLoadSpan;
	
	this.lastLoadTime;
	
	//0.0.1.8 Potential to be used if the user is followed by the blog.
	//this.userIsApproved = -1;

	this.curatedCommentLoaded = false;

	this.recentlyEditedCommentsMap = null;
}
// This is actually a minimum. Whole threads will load at once.
XhrCommentTracker.numOfCommentsToLoadAtOnce = 50;

XhrCommentTracker.prototype = {
	constructor: XhrCommentTracker,

	get numOfCommentsToLoadAtOnce() {
		return kinjamprove.options.minCommentsToLoad || this.constructor.numOfCommentsToLoadAtOnce;
	},

	set numOfCommentsToLoadAtOnce(numOfCommentsToLoadAtOnce) {
		this.constructor.numOfCommentsToLoadAtOnce = kinjamprove.options.minCommentsToLoad || numOfCommentsToLoadAtOnce;
	},
	
	getLikesOfUserUnderStarter: function() {
		var url = Utilities.getLikesOfUserUnderStarterURL(this.postId),
			_this = this;
	
		return CommentPromiseFactory.getJSON(url).then(function(result) {
			console.log('Kinjamprove: liked comment IDs result:', result);

			var data = result.data;

			for (var i = 0; i < data.length; i++) {
				var id = data[i].objectId;
				kinjamprove.userLikedPostIdsMap.set(id, 1);
			}

		
			return _this;
		});
	},

	getFlagsOfUserUnderStarter: function() {
		var url = Utilities.getFlagsOfUserUnderStarterURL(this.postId),
			_this = this;
		
		
		return CommentPromiseFactory.getJSON(url).then(function(result) {
			console.log('Kinjamprove: flagged comment IDs result:', result);

			var data = result.data;

			for (var i = 0; i < data.length; i++) {
				var id = data[i].postId;

				kinjamprove.userFlaggedPostIdsMap.set(id, 1);
			}

			
			return _this;
		});
	},
	// 0.0.2.0 Get list of blogs followed by current blog
	getBlogFollows : function(){
		var url = CommentApiURLFactory.getBlogFollowedByURL(),
			_this = this;
	
		return CommentPromiseFactory.getJSON(url).then(function(result){
			var data = result.data;
			
			for (var i = 0; i < data.length; i++){
				kinjamprove.blogsFollowed[data[i]] = 1;
			}
			
			return _this;
		});
	},
	
	// 0.0.1.8 Fix for use while not logged in
	load: function(loggedIn = true) {

		var getUserLikesUnderStarterPromise = loggedIn ? this.getLikesOfUserUnderStarter() : new Promise(function(resolve, reject){}),
			getUserFlagsUnderStarterPromise = loggedIn ? this.getFlagsOfUserUnderStarter() : new Promise(function(resolve, reject){}),
			getBlogFollows = this.userIsStaff ? this.getBlogFollows() : new Promise(function(resolve, reject){});
		
		
		return Promise.all([
			getUserLikesUnderStarterPromise, 
			getUserFlagsUnderStarterPromise,
			getBlogFollows,
			this.loadComments()
		]);
	},

	loadComments: function() {
		var _this = this,
			items = [];
		
		_this.lastLoadTime = Date.now();
		
//getTotalNumOfCommentsUrl = CommentApiURLFactory.getAPIBaseURLFromID(this.postId, 0, 1, 0, false),
			
		return CommentPromiseFactory.getArticleDataXhr(this.postId).then(function(response) {
			// console.log('Total # of comments: ', response);
			// console.log('this:', _this);
			return response;
		}).then(async function getThreadPromises(response) {
			var promises = [], 
			    totalNumOfComments = response.replyCount,
			    numOfCommentsRemaining = totalNumOfComments,
			  	currentIndex = 0,
			  	articleId = _this.postId,
				authorID = response.author.id;
			  
			_this.staffScreenNames = response.staffScreenNames;
			if(kinjamprove.kinja.postMeta.curatedReplyCounts.curated){
				_this.staffCommentIdsMap = await CommentPromiseFactory.getStaffListDataXhr(authorID, articleId);
				if(!_this.staffCommentIdsMap.size){
					_this.$failedStaffLoadSpan = $("<span>", {"class":"kinjamprove-failed-staff-loading"});
					_this.$failedStaffLoadSpan.text('Failed to load Staff Curated Comments list');
					_this.$failedStaffLoadSpan.css("color", "red");
				}
			}


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

				responses.forEach(function(response) {
				  items.push(...response);
				});

				items.sort(function(a, b) {
				  return b.children.pagination.curr.total - a.children.pagination.curr.total;
				});

				console.log('Kinjamprove: items1:', items);

				return items;
		  });
		}).then(function getFlatReplies(items) {
			var promises = [];
			//console.log('items2:', items);

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

				//console.log('total:' + total + ', remaining:' + remaining + ', numOfRequestsRemaining=' + numOfRequestsRemaining);

				while (numOfRequestsRemaining > 0) {
					//console.log('nextStartIndex='+startIndex);

					var url = flatRepliesUrl.replace(/(\?startIndex=)[0-9]*/, '$1'+startIndex),
						promise = CommentPromiseFactory.getFlatRepliesXhr(url);

					promises.push(promise);

					startIndex += 100;
					numOfRequestsRemaining--;
			   }
			}

		  return Promise.all(promises);
		}).then(function addFlatReplies(flatReplies) {
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
  
		   // console.log('items3:', items);

		   return items;
		   
		}).then(function setCommentsAndFinish(items) {
			
			_this.lastNewestPostTime = _this.newestPostTime;
			
			for (var i = 0; i < items.length; i++) {
				var item = items[i], 
					baseComment = item.reply,
					baseCommentReplies = item.children.items,
					type = {all: 0, staff: 0, pending: 0, approved: 0, user: 0, flagged: 0, liked: 0, followed: 0, curated: 0, new: 0};

				if (_this.recentlyEditedCommentsMap && 
						_this.recentlyEditedCommentsMap.hasOwnProperty(baseComment.id)) {
					baseComment.body = _this.recentlyEditedCommentsMap[baseComment.id].body;
				} 

				baseComment.depth = 0;
				baseComment.newest = baseCommentReplies.length 
					? baseCommentReplies[baseCommentReplies.length-1].publishTimeMillis
					: baseComment.publishTimeMillis;
				baseComment.replies = [];
				
				if (!baseComment.author) {
					baseComment.author = { 
						displayName: '',
						screenName: '', 
						avatar: { 
							id: '17jcxp06aqnkmpng',
							format: 'png'
						}
					}
				}else{ 
					if (!baseComment.author.avatar) {
						baseComment.author.avatar = {
							id: '17jcxp06aqnkmpng',
							format: 'png'
						};
					}
					if(!baseComment.author.displayName){
						baseComment.author.displayName = '';
						var authorBlogId = baseComment.authorBlogId,
							blogs = baseComment.blogs;
						for (var i = 0; i < blogs.length; i++) {
							if (blogs[i].id === authorBlogId) {
								baseComment.author.displayName = blogs[i].displayName.length 
									? blogs[i].displayName 
									: blogs[i].name; 
								break;
							}
						}		
					}
				}
				baseComment.author.screenName = baseComment.author.screenName || '';
				baseComment = new Comment(baseComment);
				baseComment.threadId = baseComment.id;
				baseComment.articleClass = 'reply js_reply';
				
				type.all = 1 + baseCommentReplies.length;
				_this.commentsMap.set(baseComment.id, baseComment);

				if(_this.authorMap.has(baseComment.authorId)){
					let authorComments = _this.authorMap.get(baseComment.authorId);
					authorComments.push(baseComment.id);
				}else{
					_this.authorMap.set(baseComment.authorId, [baseComment.id]);
					_this.authorNameMap.set(baseComment.authorId, baseComment.author);
				}

				for (var j = 0; j < baseCommentReplies.length; j++) {
					var reply = baseCommentReplies[j],
						replyId = reply.id,
						parentId = reply.parentId,
						replyParent = _this.commentsMap.get(parentId);
					
					reply.articleClass = 'reply js_reply';
					reply.threadId = baseComment.id;
					++replyParent.directReplyCount;
					
					if (!reply.author) {
						reply.author = { 
							displayName: '',
							screenName: '', 
							avatar: { 
								id: '17jcxp06aqnkmpng',
								format: 'png'
							}
						}
					}else{ 
						if (!reply.author.avatar) {
							reply.author.avatar = {
								id: '17jcxp06aqnkmpng',
								format: 'png'
							};
						}
						if(!reply.author.displayName){
							reply.author.displayName = '';
							var authorBlogId = reply.authorBlogId,
								blogs = reply.blogs;
							for (var i = 0; i < blogs.length; i++) {
								if (blogs[i].id === authorBlogId) {
									reply.author.displayName = blogs[i].displayName.length 
										? blogs[i].displayName 
										: blogs[i].name; 
									break;
								}
							}
						}
					}
					reply.author.screenName = reply.author.screenName || '';

					reply.authorIsStaff = _this.staffScreenNames.hasOwnProperty(reply.author.screenName);

					if(kinjamprove.followingAuthor(reply.authorId)){
						reply.followedAuthor = true;
						_this.followedAuthorCommentIds.push(replyId);
						++type.followed;
						reply.articleClass += ' kinjamprove-followedUser';
						reply.articleTitle =  "Followed Author";
					}
					if(reply.approved){
						++type.approved;
						_this.approvedCommentIds.push(replyId);
						++replyParent.directApprovedReplyCount;
						if (_this.staffCommentIdsMap.has(replyId)) {
							++type.staff;
							reply.staffCuratedReply = true;
							++replyParent.directStaffReplyCount;
							reply.articleClass += ' kinjamprove-staff-curated';
							reply.articleTitle = reply.articleTitle ? reply.articleTitle + " - Staff Curated" : "Staff Curated";
						}
					} else {
						if (_this.staffCommentIdsMap.has(replyId)) {
							_this.staffCommentIdsMap.delete(replyId);
						}
						reply.articleClass += ' kinjamprove-unapproved';
						++type.pending;
						_this.pendingCommentIds.push(replyId);
					}
					if (reply.curatedReply) {
						reply.articleClass += ' kinjamprove-curated';
					}
					if(reply.authorIsStaff){
						reply.articleClass += ' kinjamprove-staff';
						reply.articleTitle = reply.articleTitle ? reply.articleTitle + " - Staff": "Staff";
					}
					if(_this.notArticle && replyId == _this.referralId){
						reply.curated = true;
						++type.curated;
						reply.articleClass += ' kinjamprove-curated-comment';
						reply.articleTitle = "Curated";
					}
					
					if (kinjamprove.userLikedPostIdsMap.has(replyId)){
						reply.likedByUser = true;
						_this.userLikedCommentIds.push(replyId);
						++type.liked;
						reply.articleClass += ' kinjamprove-liked-by-user';
					}
					
					if (_this.recentlyEditedCommentsMap && 
							_this.recentlyEditedCommentsMap.hasOwnProperty(replyId)) {
						reply.body = _this.recentlyEditedCommentsMap[replyId].body;
					}
					
					if(Utilities.userIsCommentAuthor(reply)){
						reply.isUserComment = true;
						_this.userCommentIds.push(replyId);
						++type.user;
						reply.articleClass += ' kinjamprove-user-comment';
					}
					if (Utilities.userFlaggedPost(replyId)){
						reply.userFlagged = true;
						_this.userFlaggedCommentIds.push(replyId);
						++type.flagged;
						reply.articleClass += ' kinjamprove-flagged-comment';
					}
					
					if(kinjamprove.blogsFollowed[reply.authorBlogId]){
						reply.followedByBlog = true;
					}

					reply.depth = replyParent.depth + 1;
					reply.replies = [];
					reply = new Comment(reply);
				
					replyParent.replies.push(reply);
					
					_this.commentsMap.set(replyId, reply);
					if(_this.authorMap.has(reply.authorId)){
						let authorComments = _this.authorMap.get(reply.authorId);
						authorComments.push(replyId);
					}else{
						_this.authorMap.set(reply.authorId, [replyId]);
						_this.authorNameMap.set(reply.authorId, reply.author);
					}
					if(reply.publishTimeMillis > _this.newestPostTime){
						_this.newestPostTime = reply.publishTimeMillis;
					}
					if(_this.lastNewestPostTime && reply.publishTimeMillis > _this.lastNewestPostTime){
						++type.new;
						reply.newComment = true;
						reply.articleClass += ' kinjamprove-new-comment';
						_this.newCommentIds.push(replyId);
						if(reply.approved){
							++_this.approvedNewPosts;
						}
					}
				}
				
				baseComment.authorIsStaff = (baseComment.author && _this.staffScreenNames.hasOwnProperty(baseComment.author.screenName));
				
				
				if(kinjamprove.followingAuthor(baseComment.authorId)){
					baseComment.followedAuthor = true;
					++type.followed;
					_this.followedAuthorCommentIds.push(baseComment.id);
					baseComment.articleClass += ' kinjamprove-followedUser';
					baseComment.articleTitle =  "Followed Author";
				}
				if(baseComment.approved){
					++type.approved;
					_this.approvedCommentIds.push(baseComment.id);
					if (_this.staffCommentIdsMap.has(baseComment.id)) {
						baseComment.staffCuratedReply = true;
						++type.staff;
						baseComment.articleClass += ' kinjamprove-staff-curated';
						baseComment.articleTitle = baseComment.articleTitle ? baseComment.articleTitle + " - Staff Curated" : "Staff Curated";
					}
				} else{
					if (_this.staffCommentIdsMap.has(baseComment.id)) {
						_this.staffCommentIdsMap.delete(baseComment.id);
					}
					++type.pending;
					_this.pendingCommentIds.push(baseComment.id);
					baseComment.articleClass += ' kinjamprove-unapproved';
				}
				if(baseComment.authorIsStaff){
					baseComment.articleClass += ' kinjamprove-staff';
					baseComment.articleTitle = baseComment.articleTitle ? baseComment.articleTitle + " - Staff" : "Staff";
				}
				if (baseComment.curatedReply) {
					baseComment.articleClass += ' kinjamprove-curated';
				}
				if (kinjamprove.userLikedPostIdsMap.has(baseComment.id)){
					++type.liked;
					baseComment.likedByUser = true;
					_this.userLikedCommentIds.push(baseComment.id);
					baseComment.articleClass += ' kinjamprove-liked-by-user';
				}
				if (Utilities.userFlaggedPost(baseComment.id)){
					++type.flagged;
					baseComment.userFlagged = true;
					_this.userFlaggedCommentIds.push(baseComment.id);
					baseComment.articleClass += ' kinjamprove-flagged-comment';
				}
				if(_this.notArticle && baseComment.id == _this.referralId){
					++type.curated;
					baseComment.curated = true;
					baseComment.articleClass += ' kinjamprove-curated-comment';
					baseComment.articleTitle = "Curated";
				}
				if(Utilities.userIsCommentAuthor(baseComment)){
					++type.user;
					baseComment.isUserComment = true;
					_this.userCommentIds.push(baseComment.id);
					baseComment.articleClass += ' kinjamprove-user-comment';
				}
				if(_this.lastNewestPostTime && baseComment.publishTimeMillis > _this.lastNewestPostTime){
					++type.new;
					baseComment.newComment = true;
					baseComment.articleClass += ' kinjamprove-new-comment';
					_this.newCommentIds.push(baseComment.id);
					if(baseComment.approved){
						++_this.approvedNewPosts;
					}
				}
				if(kinjamprove.blogsFollowed[baseComment.authorBlogId]){
					baseComment.followedByBlog = true;
				}
				baseComment.setThreadVals();
				
				if(baseComment.publishTimeMillis > _this.newestPostTime){
					_this.newestPostTime = baseComment.publishTimeMillis;
				}
				_this.threadMap.set(baseComment.id, baseComment);
				if(type.staff){
					_this.threadTypes.staff.set(baseComment.id, baseComment);
				}
				if(type.liked){
					_this.threadTypes.liked.set(baseComment.id, baseComment);
				}
				if(type.user){
					_this.threadTypes.user.set(baseComment.id, baseComment);
				}				
				if(type.flagged){
					_this.threadTypes.flagged.set(baseComment.id, baseComment);
				}				
				if(type.followed){
					_this.threadTypes.followed.set(baseComment.id, baseComment);
				}				
				if(type.curated){
					_this.threadTypes.curated.set(baseComment.id, baseComment);
				}
				if(type.new){
					_this.threadTypes.new.set(baseComment.id, baseComment);
				}
				_this.commentsPerThread.set(baseComment.id, type);
			}

			_this.finished = true;

			var $contentRegion = _this.$discussionRegion.find('div.js_content-region');
			if ($contentRegion.length) {
				console.log('Kinjamprove: AFTER FINISHING LOADING COMMENTS, $contentRegion:', $contentRegion);
				_this.contentRegionAdded($contentRegion);
			}

			return _this;
		});
	},
	
	createKinjamproveLoadMoreCommentsButton: function() {
		var kinjamproveLoadMoreCommentsButtonObj = { 'class': 'kinjamprove-loadMoreCommentsButton', 'postId': this.postId },
			$kinjamproveLoadMoreCommentsButton = 
				$('<button>', kinjamproveLoadMoreCommentsButtonObj)
					.text('Load more comments');
		var _this = this;
		
		//$kinjamproveLoadMoreCommentsButton.postId = _this.postId;
		$kinjamproveLoadMoreCommentsButton.click(function() {
			var thereAreNoMoreCommentsRemainingToShow,
				activeFilter = _this.$kinjamproveFilterSelect.val();
			
			//console.log('kinjamprove load more comments button clicked: ', _this);
			if(activeFilter == "community"){
				_this.displayMoreCommentsWrapper();
			}else{
				_this.filterDiscussion(activeFilter, true);
			}

			thereAreNoMoreCommentsRemainingToShow = (_this.loadedThreads.size == _this.threadTypes[activeFilter].size);

			if (thereAreNoMoreCommentsRemainingToShow) {
				$(this).hide();
				_this.$kinjamproveLoadMoreCommentsButton.hide();
				console.log('Kinjamprove: HIDING kinjamprove Load More Comments button');
			} 
		});

		if (this.commentsMap.size <= this.numOfCommentsToLoadAtOnce) {
			$kinjamproveLoadMoreCommentsButton
				.closest('.js_discussion-region')
					.find('button.kinjamprove-loadMoreCommentsButton')
						.hide();
			// this.$discussionRegion.find('button.kinjamprove-loadMoreCommentsButton').hide();
		}
				
		this.$kinjamproveLoadMoreCommentsButton = $kinjamproveLoadMoreCommentsButton;

		return $kinjamproveLoadMoreCommentsButton;
	},
	
	toggleSpinner : function(show){
		this.$contentRegion.siblings('span.spinner').toggle(show);
		this.$contentRegion.toggle(!show);
	},
	// 0.0.1.8 1 argument indicates call by filterDiscussion. 
	// 2 arguments indicates call originating from a sort order change.
	displayMoreCommentsWrapper: function() {
		var commentTracker = this,
			numOfCommentsToLoad = this.numOfCommentsToLoadAtOnce,
			justSorting = false,
			calledByFilter = false;
		
		if(arguments.length == 1){
			calledByFilter = true;
		}else if(arguments.length == 2){
			numOfCommentsToLoad = arguments[0];
			justSorting = arguments[1];
		}

		if(commentTracker.displayMoreCommentsRunning){
			var dispayMoreCommentsFinished = setInterval(function(){
					if(!commentTracker.displayMoreCommentsRunning){
						clearInterval(dispayMoreCommentsFinished);
						commentTracker.displayMoreComments(numOfCommentsToLoad, justSorting, calledByFilter);
					}
			}, 50);
		} else{
			commentTracker.displayMoreComments(numOfCommentsToLoad, justSorting, calledByFilter);
		}
	},
	// 0.0.1.8 Only call with displayMoreCommentsWrapper
	displayMoreComments: function(numOfCommentsToLoad, justSorting, calledByFilter) {
		this.displayMoreCommentsRunning = true;
		
		if (!this.$discussionRegion) {
			this.setDiscussionRegion();
		}
		if (!this.$commentList) {
			this.setUnorderedList();
			this.$commentList.show();
		}

		this.$commentList.detach();

		var commentCount = 0,
			docFrag = document.createDocumentFragment(),
			loadType = 0,
			activeFilter = this.$kinjamproveFilterSelect.val(),
			threadsToLoad = this.threadTypes[activeFilter];
			
		if(activeFilter != "community"){
			var numThreadsAlreadyLoaded = this.loadedThreads.size,
				numThreadsLeftToShow = threadsToLoad.size - numThreadsAlreadyLoaded,
				newShownThreads = 0;
			
			loadType = 2;
			numThreadsAlreadyLoaded = this.loadedThreads.size;
			numThreadsLeftToShow = threadsToLoad.size - numThreadsAlreadyLoaded;
			if(!numThreadsLeftToShow){
				loadType = 100;
			}
		}

		for (let mapEntry of threadsToLoad) {
			if(!justSorting){
				if(loadType == 100){
					break;
				}
				if(this.loadedThreads.has(mapEntry[0])){
					continue;
				}
			}else{
				if(!this.loadedThreads.has(mapEntry[0])){
					continue;
				}
			}
			var comment = mapEntry[1],
				$li;
			
			if (comment.sort === 'newest' && !comment.newestSet) {
				comment.setNewest();
			}

			comment.sortReplies();

			$li = createNestedCommentsListItem(comment);
			docFrag.appendChild($li[0]);
			commentCount += comment.numOfDescendants + 1;
			
			this.loadedThreads.set(comment.threadId, comment);
			
			if(justSorting){
				continue;
			}
			
			this.addToVisibleCount(this.totalVisible, this.commentsPerThread.get(mapEntry[0]));
			
			if(!loadType){
				if(commentCount > numOfCommentsToLoad){
					break;
				}
			}else if(loadType == 2){

				newShownThreads = this.loadedThreads.size - numThreadsAlreadyLoaded;

				if(commentCount > numOfCommentsToLoad && newShownThreads > 2){
					break;
				}
			}
		}
				
		//console.log('commentCount=' + commentCount);

		this.$commentList.append(docFrag);
		//console.log('this.$commentList:', this.$commentList);
		if(this.$contentRegion){
			this.$contentRegion.prepend(this.$commentList);
		}else{
			this.$discussionRegion.find('div.kinjamprove-content-region').prepend(this.$commentList);
		}
		
		this.displayMoreCommentsRunning = false;
		
		if(!calledByFilter){
			this.filterDiscussion(activeFilter);
		}
		
	},
	
	addToVisibleCount: function(target, source){
		for(let type in source){
			target[type] += source[type];
		}
	},
	
	subtractFromVisibleCount: function(target, source){
		for(let type in source){
			target[type] -= source[type];
		}
	},

	countHiddenDirectRepliesToComment: function(id = 0, approved = true) {
		var $articleLi = this.commentLis[id],
			numHidden = 0,
			numApprovedHidden;
			
		if($articleLi){
			var	$hiddenReplies = $articleLi.children('li[style="display: none;"]');
			
			numHidden = $hiddenReplies.length;
			
			if(approved){
				numApprovedHidden = $hiddenReplies.not('.kinjamprove-unapproved').length;
				numHidden = numHidden - numApprovedHidden;
			}
		}
		return {pending : numHidden, approved : numApprovedHidden};
	},
	
	showThreadUntilComments: function(id, addClass = false) {
		var $article = this.commentArticles[id];
		if($article){
			let $thread = $article.parentsUntil('ul');

			$thread.removeClass('hide').show();
			if(addClass){
				$article.addClass(addClass);
			}
		}
	},	
	
	updateKinjamproveButton: function(filter) {
		var $kinjamproveButton = this.$kinjamproveLoadMoreCommentsButton,				
			numOfVisibleComments, 
			numOfCommentsRemainingToDisplay;
			
		if (filter == "staff") {
			numOfVisibleComments = this.totalVisible.staff;
			numOfCommentsRemainingToDisplay = this.staffCommentIdsMap.size - numOfVisibleComments;
		}else if (filter == "community"){ 
			if(this.hidePending) {
				numOfVisibleComments = this.totalVisible.approved;
				numOfCommentsRemainingToDisplay = this.approvedCommentIds.length - numOfVisibleComments;
			}else{
				numOfVisibleComments = this.totalVisible.all;
				numOfCommentsRemainingToDisplay = this.commentsMap.size - numOfVisibleComments;
			}
		}else if (filter == "liked"){
			numOfVisibleComments = this.totalVisible.liked;
			numOfCommentsRemainingToDisplay = this.userLikedCommentIds.length - numOfVisibleComments;
		}else if (filter == "user"){
			numOfVisibleComments = this.totalVisible.user;
			numOfCommentsRemainingToDisplay = this.userCommentIds.length - numOfVisibleComments;
		}else if (filter == "followed"){
			numOfVisibleComments = this.totalVisible.followed;
			numOfCommentsRemainingToDisplay = this.followedAuthorCommentIds.length - numOfVisibleComments;
		}else if (filter == "curated"){
			numOfVisibleComments = this.totalVisible.curated;
			numOfCommentsRemainingToDisplay = 1 - numOfVisibleComments;
		}else if (filter == "flagged"){
			numOfVisibleComments = this.totalVisible.flagged;
			numOfCommentsRemainingToDisplay = this.userFlaggedCommentIds.length - numOfVisibleComments;
		}else if (filter == "new"){
			numOfVisibleComments = this.totalVisible.new;
			numOfCommentsRemainingToDisplay = this.newCommentIds.length - numOfVisibleComments;
		} else if (this.authorMap.has(filter)){
			numOfVisisbleComments = 0 || this.totalVisible[filter];
			numOfCommentsRemainingToDisplay = this.authorMap.get(filter).length - numOfVisibleComments;
		} else{
			$kinjamproveButton.hide();
			this.$discussionRegion.attr('kinjamprove-display-comments-remaining', 0);
			return;
		}
		
		numOfCommentsRemainingToDisplay = numOfCommentsRemainingToDisplay || 0;
		
		if($kinjamproveButton){
			$kinjamproveButton.show();
			$kinjamproveButton.text('Load more comments ('+numOfCommentsRemainingToDisplay+' remaining)');
			if(!numOfCommentsRemainingToDisplay){
				$kinjamproveButton.hide();
			}
		} else {
			$kinjamproveButton = $('button.kinjamprove-loadMoreCommentsButton');
			for (var i = 0; i < $kinjamproveButton.length; ++i){
				if(parseInt($kinjamproveButton[i].getAttribute('postId')) == this.postId){
					$kinjamproveButton[i].innerText = 'Load more comments ('+numOfCommentsRemainingToDisplay+' remaining)';
					if(!numOfCommentsRemainingToDisplay){
						$($kinjamproveButton[i]).hide();
					}
				}
			}
		}
		this.$discussionRegion.attr('kinjamprove-display-comments-remaining', numOfCommentsRemainingToDisplay);
	},
	
	updateFilterSelect: function (reason, authorId = 0) {
		var tracker = this,
			$filterSelect = tracker.$kinjamproveFilterSelect,
			updateOption = function(filter, number, filterText){
				let $option = $filterSelect.find('option[value="'+filter+'"]');
				if(number || filter == "community"){
					if($option.length){
						$option.text(filterText);
					} else{
						$option = $('<option>', {value: filter, text: filterText});
						$filterSelect.append($option);
					}
				}else{
					if($option.length){
						var oldVal = $filterSelect.val();
							removeOption = function(){
								if($filterSelect.val() != oldVal){
									$filterSelect.change();
								}
							}
						$option.remove();
						$filterSelect.one({click: removeOption});
					}
				}
			},
			updatePending = function(){
				let $pendingSpan = tracker.$discussionRegion.find('span.kinjamprove-hide-pending-comments-span');
				$pendingSpan.text('Show Pending ('+tracker.pendingCommentIds.length+')');
			};
		
		if(reason == 'newUserComment'){
			updateOption('staff', tracker.staffCommentIdsMap.size, 'Staff (' + tracker.staffCommentIdsMap.size+')');
			updateOption('community', tracker.approvedCommentIds.length, 'Community (' + tracker.approvedCommentIds.length + ')');
			updateOption('user', tracker.userCommentIds.length, 'Your Comments ('+tracker.userCommentIds.length+')');
			updatePending();
		}else if(reason == 'flagging'){
			updateOption('flagged', tracker.userFlaggedCommentIds.length, 'Flagged Comments ('+tracker.userFlaggedCommentIds.length+')');
		}else if(reason == 'liked'){
			updateOption('staff', tracker.staffCommentIdsMap.size, 'Staff (' + tracker.staffCommentIdsMap.size+')');
			updateOption('community', tracker.approvedCommentIds.length, 'Community (' + tracker.approvedCommentIds.length + ')');
			updateOption('liked', tracker.userLikedCommentIds.length, 'Liked Comments ('+tracker.userLikedCommentIds.length+')');
			updatePending();
		}else if(reason == 'unliked'){
			updateOption('liked', tracker.userLikedCommentIds.length, 'Liked Comments ('+tracker.userLikedCommentIds.length+')');
		}else if(reason == 'followedForBlog'){
			updateOption('staff', tracker.staffCommentIdsMap.size, 'Staff (' + tracker.staffCommentIdsMap.size+')');
			updateOption('community', tracker.approvedCommentIds.length, 'Community (' + tracker.approvedCommentIds.length + ')');
			updateOption('followed', tracker.followedAuthorCommentIds.length, 'Followed Authors ('+tracker.followedAuthorCommentIds.length+')');
			updatePending();
		}else if(reason == 'unfollowed' || reason == 'followed' ){
			updateOption('followed', tracker.followedAuthorCommentIds.length, 'Followed Authors ('+tracker.followedAuthorCommentIds.length+')');
		}else if(authorId){
			updateOption(authorId, tracker.authorMap.get(authorId).length, reason + ' (' +tracker.authorMap.get(authorId).length+')');
			$filterSelect.val(authorId);
			$filterSelect.change();
		}
	},

	reorderCommentsOnSortChange: function(sort, justSorting = false) {
		//console.log('reorderCommentsOnSortChange sort=' + sort);
		this.stillSorting = true;
		
		var numOfCommentsToLoad = this.numOfCommentsToLoadAtOnce,
			activeFilter = this.$kinjamproveFilterSelect.val();

		if(!numOfCommentsToLoad){
			console.log("Kinjamprove: No comments to sort.");
			return;
		}
		if(justSorting){
			this.toggleSpinner(true);
		}
		
		console.time('Kinjamprove:reorderCommentsOnSortChange');
		
		if(!this.hasBeenSorted[activeFilter]){
			this.threadTypes[activeFilter] = this.sortMap(sort, this.threadTypes[activeFilter]);
			this.hasBeenSorted[activeFilter] = true;
		}
		
		this.removeListItemsFromUnorderedList();
		this.displayMoreCommentsWrapper(numOfCommentsToLoad, justSorting);
		
		this.stillSorting = false;
		
		console.timeEnd('Kinjamprove:reorderCommentsOnSortChange');
		
		if(justSorting){
			this.toggleSpinner(false);
		}
	},
	
	filterDiscussion: function(filter = this.$kinjamproveFilterSelect.val(), loadMore = false) {
		var tracker = this,
			defaultFilter = function(commentIdsArray, addClass = false) {
			
				if(loadMore && tracker.loadedThreads.size < tracker.threadTypes[filter].size){
					tracker.displayMoreCommentsWrapper(loadMore);
				}
				
				toggleComments(tracker.commentLis,Object.keys(tracker.commentLis), false);
				
				commentIdsArray.forEach(function(id){
					tracker.showThreadUntilComments(id, addClass);
				});
				
				if(filter == 'new' && tracker.hidePending){
					toggleComments(tracker.commentLis, tracker.pendingCommentIds, false);
					tracker.followedAuthorCommentIds.forEach(function(id){
						tracker.showThreadUntilComments(id);
					});
					tracker.userCommentIds.forEach(function(id){
						tracker.showThreadUntilComments(id);
					});
				}
				
				tracker.userUnhiddenArticleMap.forEach(function(value, key){
					value[0].siblings(value[1]).show();
				});
				
				tracker.commentListArticlesDescendantMap.forEach( function(value, key) {
					updateCommentRepliesDiv(value[1], key, tracker);
				});
				
				tracker.updateKinjamproveButton(filter);
			};
	
		if(filter == "community"){
			
			toggleComments(tracker.commentLis, tracker.approvedCommentIds, true);

			if(tracker.hidePending){
				
				toggleComments(tracker.commentLis, tracker.pendingCommentIds, false);
				
				tracker.followedAuthorCommentIds.forEach(function(id){
					tracker.showThreadUntilComments(id);
				});
				tracker.userCommentIds.forEach(function(id){
					tracker.showThreadUntilComments(id);
				});

				tracker.userUnhiddenArticleMap.forEach(function(value, key){
					value[0].siblings(value[1]).removeClass('hide').show();
				});

				tracker.commentListArticlesDescendantMap.forEach( function(value, key) {
					if(!value[0]){
						updateCommentRepliesDiv(value[1], key, tracker);
					} else {
						value[1].children('div.kinjamprove-show-comment-replies-div').addClass('hide-show-replies');
					}
				});
				tracker.updateKinjamproveButton(filter);
			} else {
				toggleComments(tracker.commentLis, tracker.pendingCommentIds, true);
				tracker.commentListArticlesDescendantMap.forEach( function(value, key) {
					value[1].children('div.kinjamprove-show-comment-replies-div').addClass('hide-show-replies');
				});
				tracker.updateKinjamproveButton(filter);
			}
			
		} else if(filter == "staff") {
			
			if(loadMore && tracker.loadedThreads.size < tracker.threadTypes[filter].size){
				tracker.displayMoreCommentsWrapper(loadMore);
			}
			
			toggleComments(tracker.commentLis, Object.keys(tracker.commentLis), false);
			toggleComments(tracker.commentLis, Array.from(tracker.staffCommentIdsMap.keys()), true);

			tracker.userUnhiddenArticleMap.forEach(function(value, key){
				value[0].siblings(value[1]).show();
			});
			
			tracker.commentListArticlesDescendantMap.forEach( function(value, key) {
				if(value[0] != 2 || tracker.userUnhiddenArticleMap.size){
					updateCommentRepliesDiv(value[1], key, tracker);
				} else {
					value[1].children('div.kinjamprove-show-comment-replies-div').addClass('hide-show-replies');
				}
			});
			tracker.updateKinjamproveButton(filter);

		} else if(filter == "new") {
			
			defaultFilter(tracker.newCommentIds);
			
		} else if(filter == "curated") {
			
			defaultFilter([tracker.referralId]);
			
		} else if(filter == "liked") {

			defaultFilter(tracker.userLikedCommentIds, 'kinjamprove-filter-highlight');

		} else if(filter == "user") {

			defaultFilter(tracker.userCommentIds, 'kinjamprove-filter-highlight');

		} else if(filter == "followed") {

			defaultFilter(tracker.followedAuthorCommentIds, 'kinjamprove-filter-highlight');

		} else if(filter == "flagged") {

			defaultFilter(tracker.userFlaggedCommentIds, 'kinjamprove-filter-highlight');

		} else if(tracker.authorMap.has(filter)){

			defaultFilter(tracker.authorMap.get(filter), 'kinjamprove-filter-highlight');

		}
	},
	
	toggleArticleClass: function(ids, articleClass, add = true) {
		let tracker = this,
			$article;
		ids.forEach(function(id){
			$article = tracker.commentArticles[id];
			if($article){
				$article.toggleClass(articleClass, add);
			}
		});
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
				? this.$discussionRegion.find('div.kinjamprove-content-region')
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

		//console.log('set this.$commentList to:', this.$commentList);

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
	
	sortMap: function(sort, map) {
		var sortMethod,
			newMap;

		switch(sort) {
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
		}

		Comment.sort = sort;

		newMap = new Map([...map.entries()].sort(sortMethod));

		
		return newMap;
		
		function sortThreadsOldestFirst(threadA, threadB) {
			return threadA[1].publishTimeMillis - threadB[1].publishTimeMillis;
		}
		function sortThreadsNewestFirst(threadA, threadB) {
			return threadB[1].newest - threadA[1].newest;
		}

		function sortThreadsMostRepliesFirst(threadA, threadB) {
			if (threadA[1].numOfDescendants !== threadB[1].numOfDescendants) {
				return threadB[1].numOfDescendants - threadA[1].numOfDescendants;
			} else if (threadA[1].replies.length !== threadB[1].replies.length) {
				return threadB[1].replies.length - threadA[1].replies.length;
			} else {
				return threadA[1].publishTimeMillis - threadB[1].publishTimeMillis;
			}
		}
		function sortThreadsMostLikedFirst(threadA, threadB) {     
			if (threadA[1].maxThreadLikes !== threadB[1].maxThreadLikes) {
				return threadB[1].maxThreadLikes - threadA[1].maxThreadLikes;
			} else if (threadA[1].numOfDescendants !== threadB[1].numOfDescendants) {
				return threadB[1].numOfDescendants - threadA[1].numOfDescendants;
			} else {
				return threadA[1].publishTimeMillis - threadB[1].publishTimeMillis;
			}
		}
	},
	
	reloadDiscussionRegion() {

		// Clear out all the old stuff.
		this.curatedCommentLoaded = false;
		this.approvedCommentIds = [];
		this.pendingCommentIds = [];
		this.userCommentIds = [];
		this.userFlaggedCommentIds = [];
		this.followedAuthorCommentIds = [];
		this.userLikedCommentIds = [];
		this.newCommentIds = [];

		this.commentsPerThread.clear();
		this.totalVisible = {all: 0, staff: 0, pending: 0, approved: 0, user: 0, flagged: 0, liked: 0, followed: 0, curated: 0, new: 0};
		
		this.commentLis = {};
		this.commentArticles = {};
		
		this.commentListArticlesDescendantMap.clear();
		this.userUnhiddenArticleMap.clear();
		this.commentsMap.clear();
		this.authorMap.clear();
		this.authorNameMap.clear();
		
		this.finished = false;
		
		this.loadedThreads.clear();
		this.threadMap.clear();
		this.threadTypes = {staff: new Map(), liked: new Map(), user: new Map(), flagged: new Map(), followed: new Map(), curated: new Map(), community: this.threadMap, new: new Map()};
		this.hasBeenSorted = {staff: false, liked: false, user: false, flagged: false, followed: false, curated: false, community: false, new: false};
		
		if(this.$failedStaffLoadSpan){
			this.$failedStaffLoadSpan.remove();
			this.$failedStaffLoadSpan = undefined;
		}
		this.$kinjamproveFilterSelect.parentsUntil('ul').remove();
		this.$contentRegion.hide();
		this.$contentRegion.siblings('span.spinner').show();
		
		return this.load(kinjamprove.loggedIn);
	},

	contentRegionAdded($contentRegion) {
		var commentTracker = this,
			$contentRegion = commentTracker.$contentRegion;
		
		if(!$contentRegion){
			$contentRegion = $('<div>', {'class':'kinjamprove-content-region'});
			commentTracker.$discussionRegion.find('div.replies-wrapper').children('div.js_replycol').before($contentRegion);
		}
		
		var newEvent = new CustomEvent('disableWaypoints');
		document.dispatchEvent(newEvent);
		
		var kinjamproveSpinnerBounce = createKinjamproveSpinnerBounce();
		
		
		if(!kinjamprove.headers[commentTracker.postId]){
			kinjamprove.headers[commentTracker.postId] = true;

			var $discussionHeader = commentTracker.$discussionRegion.find('div.discussion-header'),
				$discussionRegion = commentTracker.$discussionRegion,
				postId = commentTracker.postId,
				$kinjamproveDiscussionHeaderPanel = $('<div>', { 'class': 'kinjamprove-discussion-header-container' });

			createKinjamproveDiscussionHeaderLi(postId, $discussionRegion, $discussionHeader.find('ul'));
			
			addDiscussionRegionEvents($discussionRegion, postId);
			$discussionHeader.append($kinjamproveDiscussionHeaderPanel);
		}
		
		commentTracker.$kinjamproveFilterSelect = appendFilterSelect(commentTracker.postId);
		commentTracker.$kinjamproveFilterSelect.on({change: onDiscussionFilterSelectChange});
		commentTracker.setContentRegion($contentRegion);
		commentTracker.$discussionRegion.find('.spinner.bounce').remove();
		commentTracker.$discussionRegion.attr('starter-id', commentTracker.postId);
		commentTracker.$contentRegion.before(kinjamproveSpinnerBounce);
		commentTracker.$contentRegion.hide();
		commentTracker.$discussionRegion.find('span.spinner').hide();

		commentTracker.$contentRegion.empty();
		commentTracker.$discussionRegion.attr('staff-names', Object.keys(commentTracker.staffScreenNames).join(','));

		if (!commentTracker.$commentList || !commentTracker.$commentList.length) {
			commentTracker.$commentList = createUnorderedCommentList();
		}
		
		commentTracker.createKinjamproveLoadMoreCommentsButton();
		commentTracker.$contentRegion.append(commentTracker.$kinjamproveLoadMoreCommentsButton);
		commentTracker.reorderCommentsOnSortChange(kinjamprove.options.sortOrder);
		commentTracker.$contentRegion.show();
		
		if(commentTracker.notArticle){
			let curatedComment = commentTracker.commentsMap.get(commentTracker.referralId),
				parentId = curatedComment.parentId == commentTracker.postId ? commentTracker.referralId : curatedComment.parentId,
				$curatedArticleParent = commentTracker.commentLis[parentId];
			//let $curatedArticle = commentTracker.commentLis[commentTracker.commentsMap.get(commentTracker.referralId).threadId];

			if($curatedArticleParent){
				window.scrollTo(0,$curatedArticleParent.offset().top);
			}else{
				window.scrollTo(0,commentTracker.$contentRegion.offset().top);
			}
		}

		var $reloadButton = commentTracker.$discussionRegion.find('button.kinjamprove-reload-button');
		
		if (!$reloadButton.length) {
			$reloadButton = createKinjamproveReloadButton(commentTracker.$discussionRegion, commentTracker.lastLoadTime);
			commentTracker.$discussionRegion.find('div.kinjamprove-discussion-header-container').append($reloadButton);
		}else {
			$reloadButton.show();
		}
		
		if(commentTracker.$authorDatalist){
			commentTracker.$authorDatalist.remove();
		}
		let $sharingFooter = $('div.sharingfooter__wrapper'),
			$authorlistInput = $sharingFooter.find('input#kinjamprove-authorlist-input');

		commentTracker.$authorDatalist = commentTracker.createAuthorDatalist();
		$authorlistInput.append(commentTracker.$authorDatalist);
		$authorlistInput.val('');
		
		if(commentTracker.$failedStaffLoadSpan){
			commentTracker.$discussionRegion.find('div.discussion-header').append(commentTracker.$failedStaffLoadSpan);
		}
		
		if(commentTracker.lastNewestPostTime){
			if(commentTracker.$newCommentsInfoSpan){
				commentTracker.$newCommentsInfoSpan.remove();
			}
			let time = new Date(commentTracker.lastNewestPostTime),
				timeText = time.toLocaleTimeString()+' '+time.toLocaleDateString(),
				spanText = 'New comments since '+timeText+': '+commentTracker.newCommentIds.length+'.';
			if(commentTracker.newCommentIds.length){
				spanText += ' Approved new comments: ' + commentTracker.approvedNewPosts + '.';
			}
			commentTracker.$newCommentsInfoSpan = $("<span>", {'class': 'kinjamprove-new-comments-info', 'text': spanText});
			commentTracker.$discussionRegion.find('div.kinjamprove-reload-button-container').append(commentTracker.$newCommentsInfoSpan);
		}
		
		
		/*
		*	vvv FOR DEBUGGING ONLY: Adding commentsArr to DOM vvv
		*/
		// var commentsArrStr = JSON.stringify(commentTracker.commentsArr);
		//var $commentsArrContainer = createElement('input', { 'class': 'kinjamprove-comments-arr hide' , value: commentsArrStr });
		// commentTracker.$discussionRegion.append($commentsArrContainer);
		/*
		*	^^^ FOR DEBUGGING ONLY: Adding commentsArr to DOM ^^^
		*/

	},

	createAuthorDatalist() {
		var Option = function(value, text, key) {
			return {
				value: value,
				key: key,
				text: text,
				toHTML: function() {
					return '<option value="' + value + '" key="'+key+'" lowercase="'+value.toLowerCase()+'">'+text+'</option>';
				}
			};
		};
		var sortAuthorsAlpha = function(a, b){
			if(a[1].displayName.toLowerCase() > b[1].displayName.toLowerCase()){
				return 1;
			}
			return -1;
		};
		var commentTracker = this,
			authorMap = commentTracker.authorMap,
			authorNameMap = commentTracker.authorNameMap,
			$datalist = $('<datalist>', {'class':'kinjamprove-author-datalist', 'id':'kinjamprove-author-datalist'}),
			optionsArr = [];
			
		authorNameMap = new Map([...authorNameMap.entries()].sort(sortAuthorsAlpha));
		authorNameMap.forEach(function(value, key, map){
			let displayName = value.displayName,
				text = "(" + authorMap.get(key).length + ")";
			optionsArr.push(Option(displayName, text, key));
		});
		
		for(var option of optionsArr){
			$datalist.append(option.toHTML());
		}
		
		return $datalist;
	},
	
	displayAuthorPosts(authorId){
		var commentTracker = this,
			authorPostIds = commentTracker.authorMap.get(authorId),
			selectedAuthor = new Map(),
			authorName = commentTracker.authorNameMap.get(authorId).displayName;
		
		if(!commentTracker.threadTypes[authorId]){
			commentTracker.totalVisible[authorId] = 0;
			commentTracker.commentsPerThread.forEach(function(value){
				value[authorId] = 0;
			});
			
			authorPostIds.forEach(function(id){
				let comment = commentTracker.commentsMap.get(id),
					baseComment = commentTracker.commentsMap.get(comment.threadId);
				
				++commentTracker.commentsPerThread.get(baseComment.id)[authorId];
				selectedAuthor.set(baseComment.id, baseComment);
				if(commentTracker.commentLis[id]){
					++commentTracker.totalVisible[authorId];
				}
			});
			commentTracker.hasBeenSorted[authorId] = false;
			commentTracker.threadTypes[authorId] = selectedAuthor;
		}
		commentTracker.updateFilterSelect(authorName, authorId);
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
	}
	
/*	0.0.1.8 New unused stuff.
	// User comments: 'article.kinjamprove-user-comment'
	// Followed User Comments: 'article.kinjamprove-followedUser'
	// Pending: 'article.reply--unapproved:not(.kinjamprove-followedUser, .kinjamprove-user-comment, [kinjamprove-hidden])'
	// Liked: 'article.kinjamprove-liked-by-user'
	getComments: function(selector) {
		return this.$commentList.find(selector);
	},
	// Note: classes from the list items, not the articles
	showComments: function(selector, addClass = false, removeClass = false) {
		var $comments = this.getComments(selector).parent();
		$comments.removeClass('hide').show();
		if(addClass){
			$comments.addClass(addClass);
		}
		if(removeClass){
			$comments.removeClass(removeClass);
		}
	},
	// Note: classes from the list items, not the articles	
	hideComments: function(selector, addClass = false, removeClass = false) {
		var $comments = this.getComments(selector).parent();
		$comments.addClass('hide').hide();
		if(addClass){
			$comments.addClass(addClass);
		}
		if(removeClass){
			$comments.removeClass(removeClass);
		}
	},
	
	// 0.0.1.8 Show liked comments.
	// showComments('article.kinjamprove-liked-by-user', 'kinjamprove-highlight')
	// this.showThreadUntilComment('article.kinjamprove-liked-by-user')
	
	
	hideLikedComments: function(highlight = false) {
		if (highlight) {
			let liked = this.getComments('article.kinjamprove-liked-by-user');
			liked.removeClass('kinjamprove-highlight');
		}
	},
	 Not used.
	bindArticleMouseenterEvents: function(eventFunction) {
		this.$commentList.find('article').mouseenter(eventFunction);
	},
	
	unbindArticleMouseenterEvents: function(eventFunction) {
		this.$commentList.find('article').off("mouseenter", eventFunction);
	},
*/
/* 0.0.1.8 Old unused stuff. For reference.
	sortComments: function(sort) {
		var sortMethod;
		console.log('Kinjamprove: sortComments method called w/ sort="' + sort + '"');
		//console.log('this.commentsArr: ', this.commentsArr);

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
		// 0.0.1.8 New sorting!
		function sortThreadsMostRepliesFirst(threadA, threadB) {
			if (threadA.numOfDescendants !== threadB.numOfDescendants) {
				return threadB.numOfDescendants - threadA.numOfDescendants;
			} else if (threadA.likes !== threadB.likes) {
				return threadB.likes - threadA.likes;
			} else {
				return threadA.publishTimeMillis - threadB.publishTimeMillis;
			}
		}
		function sortThreadsMostLikedFirst(threadA, threadB) {     
			if ( ((threadA.maxThreadLikes != undefined) || (threadB.maxThreadLikes != undefined)) && (threadA.maxThreadLikes !== threadB.maxThreadLikes)) {
				return threadB.maxThreadLikes - threadA.maxThreadLikes;
			} else if (threadA.numOfDescendants !== threadB.numOfDescendants) {
				return threadB.numOfDescendants - threadA.numOfDescendants;
			} else {
				return threadA.publishTimeMillis - threadB.publishTimeMillis;
			}
		}
		
	}, // end of sortComments

	moveCommentToTop(commentId) {
		var thread = this.getThreadFromReplyId(commentId),
			comment = this.commentsMap.get(commentId);

		// console.log('REFERALL THREAD:', thread, 
			// 'REFERRAL COMMENT:', comment);
		
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
				//console.log('sibling.id='+sibling.id, 'comment.id='+comment.id);
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

			//console.log('siblingIndex='+siblingIndex, 'comment=', comment, 'parentComment=', parentComment, 'siblings=', tempSiblings);
		
			// for (var i = 0; i < parentComment.replies.length; i++) {
				// console.log('sibling['+i+'].id='+parentComment.replies[i].id);
			// }

			parentComment = this.commentsMap.get(parentComment.parentId);
		}
	},
	// 0.0.1.8
	getRepliesToComment: function(id = 0, approved = true) {
		var repliesCommentsSelector = 'article[data-id=' + id.toString() + ']',
			approvedSelector = approved ? 'article:not(.kinjamprove-unapproved)' : 'article',
			$replies = this.$commentList.find(repliesCommentsSelector).parent().children('li').find(approvedSelector);
		
		return $replies;
	},
	
	showRepliesToComment: function(id = 0, approved = true) {
		this.getRepliesToComment(id, approved).parent().show();
	}
*/
};
// values is an array of ids, obj contains jquery objects indexed by id
function toggleComments(obj, values, show){
	values.forEach(function(id){
		if(obj[id]){
			obj[id].toggle(show);
		}
	});
}

function getNecessaryNumberOfRequestsForAllComments(numOfComments) {
	return (numOfComments % 100 === 0) 
		? numOfComments / 100
		: Number.parseInt(numOfComments/100) + 1;
}

/* 0.0.1.8 Use kinjamproveUtilities.js stuff instead.
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
}*/