var Comment = function(xhrResponseComment) {
	this.isUserComment = undefined;
	// this.firstReply = null;
	// this.prevSibling = null
	// this.nextSibling = null;
	this.replies = [];
	this.numOfDescendants = 0;
	this.numOfApprovedDescendants = 0;
	this.numOfStaffDescendants = 0;
	// this.numOfPendingDescendants = 0;
	// this.numOfFollowedDescendants = 0;
	// this.numOfUserDescendants = 0;
	// this.numOfFlaggedDescendants = 0;
	// this.numOfLikedDescendants = 0;
	// this.numOfCuratedDescendats = 0;
	this.directReplyCount = 0;
	this.directApprovedReplyCount = 0;
	this.directStaffReplyCount = 0;

	
    for (var elem in xhrResponseComment) {
        this[elem] = xhrResponseComment[elem];
    }
    
	if (typeof this.depth === 'undefined') {
		if (this.parentId === this.starterId) {
			this.depth = 0;
		} else if (arguments.length === 2) {
			 if (typeof arguments[1] === 'object') {
				var parentComment = arguments[1];
				this.depth = parentComment.depth + 1;
	         } else if (typeof arguments[1] === 'number' || 
						parseInt(arguments[1]) !== NaN) {
				this.depth = parseInt(arguments[1]);
	         }
	    }
	}
	
	this.likes = this.likes || 0;
	this.maxThreadLikes = this.maxThreadLikes || this.likes;
	if (typeof this.newest === 'undefined' || this.newest === null) {
		this.newest = this.publishTimeMillis;
	}
}

Comment.sort = 'oldest';

Comment.prototype = {
	constructor: Comment,

	get sort() {
		return this.constructor.sort;
	},

	set sort(sort) {
		this.constructor.sort = sort;
	},

	get newestFormatted() {
		return Utilities.publishTimeFormatter(this.newest);
	},

	setReplies: function(thread) {
		if (!thread.length) {
			return;
        }

		var replies = [],		
			descendantsRemainingInThread = [];

		for (var i = 0; i < thread.length; i++) {
			var reply = thread[i];

			if (reply.parentId === this.id) { 
				replies.push(reply);
			} else {
				descendantsRemainingInThread.push(reply);
			}
		}

		for (var i = 0; i < replies.length; i++) {
			var reply = new Comment(replies[i], this.depth+1);
			reply.setReplies(descendantsRemainingInThread);
			this.replies.push(reply);				
        }
	},

	setNewest: function() {
		if (typeof this.newest !== 'number' 
				|| this.newest < this.publishTimeMillis) { 
			this.newest = this.publishTimeMillis;
		}

		for (var i = 0; i < this.replies.length; i++) {
			var reply = this.replies[i];
			this.newest = Math.max(reply.setNewest(), this.newest);
		} 

		this.newestSet = true;

		return this.newest;
	},

	setThreadVals : function() {

		for (var i = 0; i < this.replies.length; i++) {
			var reply = this.replies[i],
				values = reply.setThreadVals(),
				replyMaxThreadLikes = values.likes,
				replyNumOfDescendants = values.numReplies,
				replyNumApproved = values.numApproved
				replyNumStaff = values.numStaff;
				
			this.numOfDescendants += replyNumOfDescendants;
			this.numOfStaffDescendants += replyNumStaff;
			this.numOfApprovedDescendants += replyNumApproved;
			// this.numOfPendingDescendants += values.numPending;
			// this.numOfFollowedDescendants += values.numFollowed;
			// this.numOfUserDescendants += values.numUser;
			// this.numOfFlaggedDescendants += values.numFlagged;
			// this.numOfLikedDescendants += values.numLiked;
			// this.numOfCuratedDescendats += values.numCurated;
			this.maxThreadLikes = Math.max(this.maxThreadLikes, replyMaxThreadLikes);
		}

		return {
			likes: this.maxThreadLikes,
			numReplies: (this.numOfDescendants + 1),
			numApproved: (this.approved ? this.numOfApprovedDescendants + 1 : this.numOfApprovedDescendants),
			numStaff: (this.staffCuratedReply ? this.numOfStaffDescendants + 1 : this.numOfStaffDescendants)
			// numPending: (this.approved ? this.numOfPendingDescendants : this.numOfPendingDescendants + 1),
			// numFollowed: (this.followedAuthor ? this.numOfFollowedDescendants + 1 : this.numOfFollowedDescendants),
			// numUser: (this.isUserComment ? this.numOfUserDescendants + 1 : this.numOfUserDescendants),
			// numFlagged: (this.userFlagged ? this.numOfFlaggedDescendants + 1 : this.numOfFlaggedDescendants),
			// numLiked: (this.likedByUser ? this.numOfLikedDescendants + 1 : this.numOfLikedDescendants),
			// numCurated: (this.curated ? this.numOfCuratedDescendats + 1 : this.numOfCuratedDescendats)
		}
	},
	
	setThreadLikes: function(){
		for (var i = 0; i < this.replies.length; i++) {
			var reply = this.replies[i],
				values = reply.setThreadLikes(),
				replyMaxThreadLikes = values.likes;
				
			this.maxThreadLikes = Math.max(this.maxThreadLikes, replyMaxThreadLikes);
		}

		return {
			likes: this.maxThreadLikes
		}
	},
	
	updateThreadForNewComment: function(commentTracker, repliesToAdd){
		let parentComment = commentTracker.commentsMap.get(this.parentId),
			parentCommentId = 0;
			//threadCount = commentTracker.commentsPerThread.get(this.threadId);
		if(parentComment){
			parentCommentId = parentComment.id;
			parentComment.numOfDescendants += repliesToAdd.n;
			if(this.approved){
				parentComment.numOfApprovedDescendants += repliesToAdd.a;
				if(!parentComment.approved){
					++repliesToAdd.a;
					--repliesToAdd.p;
					++parentComment.directApprovedReplyCount;
					parentComment.approved = true;
					// ++threadCount.approved;
					// --threadCount.pending;
					commentTracker.approvedCommentIds.push(parentCommentId);
					commentTracker.pendingCommentIds = 
						commentTracker.pendingCommentIds.filter(function(value){
							if(value == parentCommentId){
								return false;
							}else{
								return true;
							}
						});
				}
				if(this.staffCuratedReply) {
					parentComment.numOfStaffDescendants += repliesToAdd.s;
					if(!parentComment.staffCuratedReply){
						++repliesToAdd.s;
						parentComment.staffCuratedReply = true;
						++parentComment.directStaffReplyCount;
						commentTracker.staffCommentIdsMap.set(parentCommentId, 1);
						// ++threadCount.staff;
					}
				}
			}
			parentComment.updateThreadForNewComment(commentTracker, repliesToAdd);
		}else{
			this.setNewest();
		}
		
		this.updateArticleDOM(commentTracker, parentCommentId);
	},
	
	// 0.0.1.8 Only blog owner can delete comments.
	updateThreadForDeletedComment: function(commentTracker){
		let parentComment = commentTracker.commentsMap.get(this.parentId);
		if(parentComment){
			--parentComment.numOfDescendants;
			--parentComment.numOfApprovedDescendants;
			--parentComment.numOfStaffDescendants;
			parentComment.updateThreadForDeletedComment(commentTracker);
		} else{
			this.setNewest();
		}
		let $article = commentTracker.commentArticles[this.id];
		if($article){
			let numDirectApprovedMinusStaff = this.directApprovedReplyCount - this.directStaffReplyCount,
				articleObj = {
					descendants: this.numOfDescendants,
					adescendants: this.numOfApprovedDescendants,
					sdescendants: this.numOfStaffDescendants,
					'd-replies': this.directReplyCount,
					'd-areplies': this.directApprovedReplyCount,
					'd-sreplies': this.directStaffReplyCount,
					'data-newest': this.newest
				};

			if(!numDirectApprovedMinusStaff){
				$article.removeClass('has-direct-delta');
			}
			if(!this.numOfDescendants){
				$article.removeClass('has-descendants');
			}

			// Type of replies: 0 = pending, 1 = approved, 2 = staff
			let type = 2;
			if(this.numOfApprovedDescendants - this.numOfStaffDescendants){
				type = 1;
			}
			if(this.numOfDescendants - this.numOfApprovedDescendants){
				type = 0;
			}
			commentTracker.commentListArticlesDescendantMap.set(this.id, [type, $article]);

			$article.attr(articleObj);
			updateCommentRepliesDiv($article, this.id, commentTracker);
		}
	},
	
	updateThreadForLikes: function(commentTracker, increase){
		let parentComment = commentTracker.commentsMap.get(this.parentId),
			parentCommentId = 0;
		if(increase && parentComment){
			parentCommentId = parentComment.id;
			if(parentComment.maxThreadLikes < this.maxThreadLikes){
				parentComment.maxThreadLikes = this.maxThreadLikes;
			}
			parentComment.updateThreadForLikes(commentTracker, true);
		}else if(!increase){
			if(parentComment){
				parentCommentId = parentComment.id;
				parentComment.maxThreadLikes = parentComment.likes;
				parentComment.updateThreadForLikes(commentTracker, false);
			}else{
				this.setThreadLikes();
			}
		}
		let $article = commentTracker.commentArticles[this.id];
		if($article){
			let articleObj = {
					'data-maxthreadlikes': this.maxThreadLikes
				};
			$article.attr(articleObj);
		}
		
	},
	
	updateArticleDOM: function(commentTracker, parentId = 0){
		let commentId = this.id,
			$article = commentTracker.commentArticles[commentId];
		if($article){
			let numPending = this.numOfDescendants - this.numOfApprovedDescendants,
				numPendingDirect = this.directReplyCount - this.directApprovedReplyCount,
				numDirectApprovedMinusStaff = this.directApprovedReplyCount - this.directStaffReplyCount,
				articleObj = {
					descendants: this.numOfDescendants,
					adescendants: this.numOfApprovedDescendants,
					pdescendants: numPending,
					sdescendants: this.numOfStaffDescendants,
					'd-replies': this.directReplyCount,
					'd-areplies': this.directApprovedReplyCount,
					'd-preplies': numPendingDirect,
					'd-sreplies': this.directStaffReplyCount,
					'data-maxthreadlikes': this.maxThreadLikes,
					'data-newest': this.newest
				};


			if(this.approved){
				let $articleLi = $article.parent();
				
				$article.removeClass('kinjamprove-unapproved');
				$articleLi.removeClass('kinjamprove-unapproved');
				if(!commentTracker.approvedCommentIds.includes(commentId)){
					commentTracker.approvedCommentIds.push(commentId);
					commentTracker.pendingCommentIds = 
						commentTracker.pendingCommentIds.filter(function(value){
							if(value == commentId){
								return false;
							}else{
								return true;
							}
						});
				}
				if(this.staffCuratedReply){
					$article.addClass('kinjamprove-staff-curated');
					articleObj['title'] = "Staff Curated";
					commentTracker.staffCommentIdsMap.set(commentId, 1);
				}
			}

			$article.toggleClass('has-descendants', this.numOfDescendants);
			$article.toggleClass('has-direct-pending', numPendingDirect);
			$article.toggleClass('has-direct-delta', numDirectApprovedMinusStaff);
			
			// Type of replies: 0 = pending, 1 = approved, 2 = staff
			let type = 2;
			if(this.numOfApprovedDescendants - this.numOfStaffDescendants){
				type = 1;
			}
			if(numPending){
				type = 0;
			}
			commentTracker.commentListArticlesDescendantMap.set(commentId, [type, $article]);

			$article.attr(articleObj);

			if(parentId && commentTracker.userUnhiddenArticleMap.has(parentId)){
				let value = commentTracker.userUnhiddenArticleMap.get(parentId);
				if(value[1] != 'li'){
					value[1] += ',li[data-id="'+commentId+'"]';
				}
			}

			let title = "Approved replies in thread: " + this.numOfApprovedDescendants + "\nPending replies in thread: " + numPending,
				linkObj = {
					descendants: this.numOfDescendants,
					adescendants: this.numOfApprovedDescendants,
					pdescendants: numPending,
					sdescendants: this.numOfStaffDescendants,
					'd-replies': this.directReplyCount,
					'd-areplies': this.directApprovedReplyCount,
					'd-preplies': numPendingDirect,
					'd-sreplies': this.directStaffReplyCount,
					'd-deltareplies': numDirectApprovedMinusStaff,
					'data-newest': this.newest, 
					title: title	
				};
			$article.children('div.kinjamprove-show-comment-replies-div').children().attr(linkObj);
			
			updateCommentRepliesDiv($article, commentId, commentTracker);
		}
	},
	
	sortReplies: function() {
		if(this.sort == this.lastSort){
			return;
		}
		switch (this.sort) {
			case 'likes':
				this.sortRepliesMostLikesFirst(); 
				break;
			case 'replies':
				this.sortRepliesMostRepliesFirst(); 
				break;
			case 'newest': 
				this.sortRepliesNewestFirst(); 
				break;
			default:
				this.sortRepliesOldestFirst();
		}
		this.lastSort = this.sort;
	},

	sortRepliesNewestFirst: function() {
		this.replies.sort(newestSort);

		for (var i = 0; i < this.replies.length; i++) {
			var reply = this.replies[i];
			reply.sortRepliesNewestFirst();
        }

		function newestSort(a, b) {
			return b.newest - a.newest;
        }
    },

	sortRepliesOldestFirst: function() {
		this.replies.sort(oldestSort);
		
		for (var i = 0; i < this.replies.length; i++) {
			var reply = this.replies[i];
			reply.sortRepliesOldestFirst();
        }
    		
		function oldestSort(a, b) {
			return a.publishTimeMillis - b.publishTimeMillis;
        }
	},
	
	sortRepliesMostRepliesFirst: function() {
		this.replies.sort(mostRepliesSort);
		
		for (var i = 0; i < this.replies.length; i++) {
			this.replies[i].sortRepliesMostRepliesFirst();
		}
		
		function mostRepliesSort(a, b) {
			if (a.numOfDescendants !== b.numOfDescendants) {
				return b.numOfDescendants - a.numOfDescendants;
			}
			else if (a.replies.length !== b.replies.length) {
				return b.replies.length - a.replies.length;
			}
			 else {
				return b.publishTimeMillis - a.publishTimeMillis;
			}
		}
	},
		
	sortRepliesMostLikesFirst: function() {
		this.replies.sort(mostLikes);
		
		for (var i = 0; i < this.replies.length; i++) {
			this.replies[i].sortRepliesMostLikesFirst();
		}

		function mostLikes(a, b) {
			if ( ((a.maxThreadLikes != undefined) || (b.maxThreadLikes != undefined)) && (a.maxThreadLikes !== b.maxThreadLikes)) {
				return b.maxThreadLikes - a.maxThreadLikes;
			} else if (a.numOfDescendants !== b.numOfDescendants) {
				return b.numOfDescendants - a.numOfDescendants;
			} else {
				return a.publishTimeMillis - b.publishTimeMillis;
			}
		}	
	},

	sortRepliesMostPopularFirst: function() {
		this.replies.sort(mostPopularSort);
		
		for (var i = 0; i < this.replies.length; i++) {
			var reply = this.replies[i];
			reply.sortRepliesMostPopularFirst();
        }
		
		function mostPopularSort(replyA, replyB) {
			if (replyA.replyCount !== replyB.replyCount) {
				return replyB.replyCount - replyA.replyCount;
			} else if (replyA.likes !== replyB.likes) {
				return replyB.likes - replyA.likes;
			} else {
				return replyA.publishTimeMillis - replyB.publishTimeMillis;
			}
		}
	},
};