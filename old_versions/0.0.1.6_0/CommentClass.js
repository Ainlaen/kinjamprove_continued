var Comment = function(xhrResponseComment) {
	this.isUserComment = undefined;
	// this.firstReply = null;
	// this.prevSibling = null
	// this.nextSibling = null;
	this.replies = [];
	this.numOfDescendants = 0;

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

	if (typeof this.newest === 'undefined' || this.newest === null) {
		this.newest = this.publishTimeMillis;
	}
	if (typeof this.maxThreadLikes === 'undefined' || this.maxThreadLikes === null) {
		this.maxThreadLikes = this.likes;
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

	setMaxThreadLikes: function() {
		for (var i = 0; i < this.replies.length; i++) {
			var reply = this.replies[i],
				replyMaxThreadLikes = reply.setMaxThreadLikes();

			this.maxThreadLikes = Math.max(this.maxThreadLikes, replyMaxThreadLikes);
		}

		return this.maxThreadLikes;
	},

	sortReplies: function() {
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
			if (a.replyCount !== b.replyCount) {
				return b.replyCount - a.replyCount;
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
			return b.maxThreadLikes - a.maxThreadLikes;
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