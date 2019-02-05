// 0.0.2.4 Kinja API calls updated

var Utilities = (function() {
	const CHROME_EXTENSION_BASE_URL = 'chrome-extension://' + chrome.runtime.id + '/';

	// var kinjamproveWindowVariablesContainer = document.getElementById(KINJAMPROVE_WINDOW_VARIABLES_CONTAINER_ID),
		// kinjamproveWindowVariablesContainerJSON;

	
	return {
		addScriptToPage: function(sourceFileName) {
			var sourcePath = CHROME_EXTENSION_BASE_URL + sourceFileName;
			
			if ($('head script[src*="' + sourcePath + '"]').length) {
				return;
			}
			
			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = sourcePath;
			document.head.appendChild(script);
		},
		
		addStyleToPage: function(sourceFileName) {
			var sourcePath = CHROME_EXTENSION_BASE_URL + 'styles/' + sourceFileName;
		
			if ($('head > link[href*="' + sourcePath + '"]').length) {
				return;
			}

			var style = document.createElement('link');
			style.type = 'text/css';
			style.href = sourcePath;
			style.rel = 'stylesheet';
			style.id = 'kinjamprove-' + sourceFileName.substring(0, sourceFileName.indexOf('.'));
			document.head.appendChild(style);
		},

		commentAuthorIsKinjamproveCreator: function(comment) {
			return comment.author.screenName === 'mark-bowen1';
		},

		userIsCommentAuthor: function(comment) {
			return kinjamprove.accountState.authorId === comment.authorId; 
		},
		
		userIsBlogOwner: function() {
			var blogOwnerId = kinjamprove.kinja.meta.blogOwner.id;
				//Utilities.getKinjamproveWindowVariablesContainerJSON().kinja.meta.blogOwner.id;

			return blogOwnerId === Utilities.getUserAuthorId();
		},

		commentIsDeletableByUser: function(comment) {
			return Utilities.userIsCommentAuthor(comment) && 
				   Utilities.commentPublishedInLastFifteenMinutes(comment)
				   && Utilities.userIsBlogOwner();
		},

		commentPublishedInLastFifteenMinutes: function(comment) {
			let time = comment.publishTimeMillis + minutesToMillis(15);
			if (!(Date.now() < time)){
				return false;
			}
			return time - Date.now();
			
			function minutesToMillis(minutes) {
		        var seconds = minutes * 60,
		            millis = seconds * 1000;

		        return millis;
		    }
		},

		commentIsEditableByUser: function(comment) {	
			if(!Utilities.userIsCommentAuthor(comment)){
				return false;
			}
			return Utilities.commentPublishedInLastFifteenMinutes(comment);
		},
		
		// Clears confirmation for navigating away from page.
		clearWindowOnbeforeunload: function(){
			document.dispatchEvent(new CustomEvent("clearOnbeforeunload"), {});
		},
		/*
		getKinjamproveWindowVariablesContainerJSON: function() {			

			return kinjamproveWindowVariablesContainerJSON 
				? kinjamproveWindowVariablesContainerJSON
				// : JSON.parse(document.getElementById(KINJAMPROVE_WINDOW_VARIABLES_CONTAINER_ID).textContent)
				: JSON.parse(document.getElementById(KINJAMPROVE_WINDOW_VARIABLES_CONTAINER_ID).value);
		},
		*/
		getKinjaToken: function() {
			return kinjamprove.token.token;
			//return Utilities.getKinjamproveWindowVariablesContainerJSON().token.token;
		},
		
		getBlogId: function(){
			return kinjamprove.kinja.meta.blog.id;
			//return Utilities.getKinjamproveWindowVariablesContainerJSON().kinja.meta.blog.id;
		},
		
		getUserDefaultBlogId: function() {
			return kinjamprove.accountState.defaultBlogId;
			//return Utilities.getKinjamproveWindowVariablesContainerJSON().accountState.defaultBlogId;
		},

		getUserAuthorId: function() {
			return kinjamprove.accountState.authorId;
			//return Utilities.getKinjamproveWindowVariablesContainerJSON().accountState.authorId;
		},

		userFlaggedPost: function(postId) {
			return kinjamprove.userFlaggedPostIdsMap.has(postId);
		},
		
		followingAuthor: function(authorId) {
			return kinjamprove.accountState.followedAuthorIds.hasOwnProperty(authorId);
		},
		/* 0.0.1.9 Unused
		storeVariables: function() {
			var kinja = kinjamprove.kinja,
				userData = kinjamprove.userData,
				accountState = userData.data.accountState,
				token = userData.data.token,
				variableDataObj = {
					kinja: kinja,
					accountState: accountState, 
					token: token,
					lastUpdateTime: Date.now()
				},
				variableDataStr = JSON.stringify(variableDataObj);
		
			kinjamproveWindowVariablesContainerJSON = variableDataObj;
		
			if (kinjamproveWindowVariablesContainer) {
				// kinjamproveWindowVariablesContainer.innerText = variableDataStr;
				kinjamproveWindowVariablesContainer.value = variableDataStr;
			} else {
				kinjamproveWindowVariablesContainer = document.createElement('input');
				kinjamproveWindowVariablesContainer.id = KINJAMPROVE_WINDOW_VARIABLES_CONTAINER_ID;
				kinjamproveWindowVariablesContainer.style = 'display: none;';
				// kinjamproveWindowVariablesContainer.innerText = variableDataStr;
				kinjamproveWindowVariablesContainer.value = variableDataStr;

				document.body.appendChild(kinjamproveWindowVariablesContainer);
			}
		},
		*/
		getStaffArticleDataModelJSON: function ($story) {
			$story = $story || $('article.post:first');

			if (!$story || !$story.length) {
				return null;
			}

		    var dataModelAttr = $story.attr('data-model');
		    if (!dataModelAttr) {
		    	return null;
		    }

		   var dataModelStr = dataModelAttr
		   		// remove e.g. %7B, %2C, %3A, etc. 
	    		.replace(/%[0-9][0A-E]/g, '')
	    		.replace(/%[2-7][0-9]/g, ' ')

		        // reduce consecutive whitespaces to a single whitespace
		        .replace(/\s{2,}/g, ' ')

		        // remove leading whitespace
		        .slice(1);

			var authorIdsMatch = dataModelStr.match(/authorIds (([0-9]* ?)*)/),
				dataBeforeAuthorIds = dataModelStr.slice(0, authorIdsMatch.index),
				authorIdsStr = authorIdsMatch[0],
				authorIds = authorIdsStr.split('authorIds ')[1].trim().split(' '),
				dataAfterAuthorIdsIndex = authorIdsStr.length + dataBeforeAuthorIds.length,
				dataAfterAuthorIds = dataModelStr.slice(dataAfterAuthorIdsIndex),
				dataModelJSONStr =
					(dataBeforeAuthorIds + dataAfterAuthorIds)
						// put key/val pairs in JSON format 
						.replace(/(\w*) (\w*) /g, '"$1":$2,')

						// wrap string (and, unintentionally, bool/null) values in quotes
						.replace(/:([a-zA-Z]*)?,/g, ':"$1",')

						// remove the quotes from the incidentally-wrapped boolean & null values
						.replace(/:"(null|true|false)"/g, ':$1')

						// remove trailing comma
						.slice(0, -1), 
				dataModelObj = JSON.parse('{' + dataModelJSONStr + '}');

			for (var i = 0; i < authorIds.length; i++) {
			    authorIds[i] = Number.parseInt(authorIds[i]);
			}
			dataModelObj.authorIds = authorIds;

			return dataModelObj;
		},

		getLocation: function(url) {
			url = url || window.location.href;

		    var locationElem = createElement('a', { href: url });    
		    var location = {
		        hash: null,
		        host: null,
		        hostname: null,
		        href: null,
		        origin: null,
		        pathname: null,
		        protocol: null
		    };
		    
		    for (var prop in location) {
		        location[prop] = locationElem[prop];
		    }
		    
		    location.toString = function() { return this.href; }
		    
		    return location;
		},

		getRefIdFromURL: function(url) {
			var urlLocation;

			if (!arguments.length) {
				urlLocation = window.location;
			} else {
				urlLocation = Utilities.getLocation(url);
			}

			var pathname = urlLocation.pathname,
				pathnameMatches = pathname.match(/.*?([0-9]+$)/),
				refId = pathnameMatches.length ? pathnameMatches[1] : null;

			return refId;
		},

		// 0.0.1.8 Not currently used.
		getStarterIdOfCurrentPage: function(referralId) {
			if (!referralId) {
				var pathname = window.location.pathname,
					matches = pathname.match(/[0-9]+/g);

				referralId = matches[matches.length-1];
			}

			return CommentPromiseFactory.getArticleDataXhr(referralId).then(function(response) {
				return response.starterId;
			});
		},

		getStarterIdOfFirstStory: function() {
			return kinjamprove.kinja.meta.starterId;
		},

		getLikesOfUserUnderStarterURL: function(starterId) {
			starterId = starterId || Utilities.getStarterIdOfFirstStory();
			
			//console.log('getLikesOfUserUnderStarter called w/ starterId=' + starterId);
			
			var origin = window.location.origin,
				likesOfUserUnderStarterUrl = origin +
					'/api/likes/views/likesOfUserUnderStarter?starterId=' + starterId;

			return likesOfUserUnderStarterUrl;
		},

		getFlagsOfUserUnderStarterURL: function(starterId) {
			if (!arguments.length) {
				starterId = Utilities.getStarterIdOfFirstStory();
			}
			
			var origin = window.location.origin,
				flaggedPostsPathname = '/api/moderation/flagging/views/flagsByStarter',
				flaggedPostsQueryStr = '?starterId=' + starterId,
				flagsOfUserUnderStarterUrl = 
					origin + flaggedPostsPathname + flaggedPostsQueryStr;

			return flagsOfUserUnderStarterUrl;
		},

		setWindowOnbeforeunload() {
			window.onbeforeunload = function() {
				var $scribe = $('section.js_discussion-region div.editor div.scribe');

				if ($scribe.length && $scribe.text().length) {
					return 'Kinjamprove: Changes you made may not be saved.';
				}
			};
		},

		publishTimeFormatter(dateTime) {
			dateTime = new Date(dateTime);

			var hours = dateTime.getHours(),
				minutes = (dateTime.getMinutes() < 10)
					? '0'+dateTime.getMinutes() 
					: dateTime.getMinutes(),
				meridean,
				month = dateTime.getMonth() + 1,
				dayOfMonth = (dateTime.getDate() < 10) 
					? '0'+dateTime.getDate() 
					: dateTime.getDate(),
				year = dateTime.getFullYear().toString().slice(2),
				date = month + '/' + dayOfMonth + '/' + year,
				time;

			if (hours === 12) {
				meridean = 'pm';
			} else if (hours === 0) {
				meridean = 'am';
				hours = 12;
		    } else if (hours > 12) {
				meridean = 'pm';
				hours -= 12;
		    } else {
				meridean = 'am';
		    }

			time = hours + ':' + minutes + meridean;

			return date + ' ' + time;
		}

	};
})();

var CommentApiURLFactory = (function(){
	const ORIGIN = window.location.origin, 
		  MAX_NUM_OF_COMMENTS_PER_REQUEST = 100;

	var createURL = function(pathname, queryParameters) {
		return ORIGIN + pathname + '?' + $.param(queryParameters);
	};

	return {
		createURL: createURL,

		getAPIArticleURLFromID: function(starterId) {
			return ORIGIN + '/ajax/post/rendered/' + starterId + '/full';
		},

		getAPIBaseURLFromID: function(articleId, startIndex, maxReturned, maxChildren, approvedOnly, cacheIt, sorting) {
			if (arguments.length === 1 && typeof arguments[0] === 'object') {
				var dataObj = arguments[0]
				articleId = dataObj.articleId;
				startIndex = dataObj.startIndex || 0;
				maxChildren = dataObj.maxChildren || MAX_NUM_OF_COMMENTS_PER_REQUEST;
				approvedOnly = dataObj.approvedOnly || false;
				cacheIt = dataObj.cacheIt || true;
				sorting = dataObj.sorting || 'top'
			} else {
				startIndex = startIndex || 0;
				maxReturned = maxReturned || MAX_NUM_OF_COMMENTS_PER_REQUEST;
				maxChildren = maxChildren || 500;
				approvedOnly = approvedOnly || false;
				cacheIt = cacheIt || true;
				sorting = sorting || 'top';
			}
			// 0.0.1.8 old:'/api/comments/views/replies/'
			var apiPathname = '/ajax/comments/views/replies/' + articleId,
				queryParameters = { 
					startIndex: startIndex,
					maxReturned: maxReturned,
					maxChildren: maxChildren,
					approvedOnly: approvedOnly,
					cache: cacheIt,
					sorting: sorting
				};

			return createURL(apiPathname, queryParameters);
		},

		getCreateCommentURL: function(parentId, hidePendingReplies) {
			// parentId = parentId || Utilities.getStarterIdOfCurrentPage();
			hidePendingReplies = hidePendingReplies || false;
			var apiPathname = '/api/core/post/' + parentId + '/replyWithApprovals',
				queryParameters = { hidePendingReplies: hidePendingReplies };
	

			return createURL(apiPathname, queryParameters);
		},

		getUpdateCommentURL: function(postId) {
			return ORIGIN + '/api/core/post/' + postId + '/update?';
		},

		getDeleteCommentURL: function(postId) {

			var apiPathname = '/api/core/post/' + postId + '/delete';
				

        	return ORIGIN + apiPathname;
		},

		getDismissPostURL: function() {
			// 0.0.1.8
			var apiPathname = '/api/comments/dismiss/dismiss';
				//apiPathname = '/ajax/post/' + postId + '/dismiss/' + defaultBlogId,
				//queryParameters = { token: kinjaToken };

		    return ORIGIN + apiPathname;
				//createURL(apiPathname, queryParameters);
		},

		getLikeCommentURL: function(postId, kinjaToken) {
			kinjaToken = kinjaToken || Utilities.getKinjaToken();

			var apiPathname = '/ajax/post/' + postId + '/likeAndApprove',
				queryParameters = { token: kinjaToken };

			return createURL(apiPathname, queryParameters);
		},

		getFlatRepliesUrlForComment: function(commentId, startIndex, approvedOnly) {
			var flatRepliesPathname = '/api/comments/views/flatReplies/' + commentId,
				queryParameters = { 
					startIndex: startIndex, 
					maxReturned: MAX_NUM_OF_COMMENTS_PER_REQUEST, 
					approvedOnly: approvedOnly,
					cache: true
				};

			return createURL(flatRepliesPathname, queryParameters);
		},

		getStaffRepliesURL: function(staffMemberID, refId = null, starterId, maxReturned, cacheIt) {
			starterId = starterId || Utilities.getStarterIdOfFirstStory();
			maxReturned = maxReturned || MAX_NUM_OF_COMMENTS_PER_REQUEST;
			cacheIt = cacheIt || true;
			
			// Example url: 'https://www.avclub.com/api/comments/views/curatedReplies/1798398429?query=seanoneal&maxReturned=5&cache=true&refId=1798521900';
		    var apiPathname = '/api/comments/views/curatedReplies/' + starterId, 
		    	queryParameters = { 
		    		userIds: staffMemberID, 
		    		maxReturned: maxReturned,
		    		cache: cacheIt
		    	};
			if(refId){
				queryParameters.refId = refId;
			}
							    
		    return createURL(apiPathname, queryParameters);
		},
		
		getCuratedRepliesURL: function(userIds, refId, starterId, maxReturned, cacheIt) {
			starterId = starterId || Utilities.getStarterIdOfFirstStory();
			maxReturned = maxReturned || MAX_NUM_OF_COMMENTS_PER_REQUEST;
			cacheIt = cacheIt || true;
			
			// Example url: https://www.theroot.com/ajax/comments/views/curatedReplies/1830695539?maxReturned=1&cache=true&refId=1830699409&userIds=5876237249238334001
		    var apiPathname = '/ajax/comments/views/curatedReplies/' + starterId, 
		    	queryParameters = { 
		    		maxReturned: maxReturned,
		    		cache: cacheIt,
					userIds : userIds
		    	};
			if(refId){
				queryParameters.refId = refId;
			}
		    return createURL(apiPathname, queryParameters);
		},
		
		getBlogmembershipURL: function(userId) {
			userId = userId || Utilities.getUserAuthorId();
			
			var apiPathname = '/api/profile/blogmembership/views/byUsers',
				queryParameters = {
					ids: userId
				};
			return createURL(apiPathname, queryParameters);
		},
		
		getBlogmembershipStaffURL: function(blogId){
			blogId = blogId || Utilities.getBlogId();
			
			var apiPathname = '/api/profile/blogmembership/views/manageBlogMembers',
				queryParameters = {
					blogId: blogId
				};
			return createURL(apiPathname, queryParameters);
		},
		
		getBlogFollowURL: function(postId, targetBlogId, blogId, authorId, token){
			blogId = blogId || Utilities.getBlogId();
			authorId = authorId || Utilities.getUserAuthorId();
			token = token || Utilities.getKinjaToken();
			
			var apiPathname = '/ajax/post/'+postId+'/followAndApprove/blog/'+targetBlogId+'/by/'+blogId,
				queryParameters = {
					authorId: authorId,
					token: token
				};
			return createURL(apiPathname, queryParameters);
		},
		
		getBlogUnfollowURL: function(token){
			token = token || Utilities.getKinjaToken();
			
			var apiPathname = '/api/profile/blogfollow/unfollow',
				queryParameters = {
					token: token
				};
			return createURL(apiPathname, queryParameters);
		},
		
		getBlogBlockURL: function(token){
			token = token || Utilities.getKinjaToken();
		
			var apiPathname = '/api/profile/blogblock/block',
				queryParameters = {
					token: token
				};
			return createURL(apiPathname, queryParameters);
		},
		
		getBlogFollowedByURL: function(blogId){
			blogId = blogId || Utilities.getBlogId();
			
			var apiPathname = '/api/profile/blogfollow/views/followedBy',
				queryParameters = {
					blogId: blogId
				};
			return createURL(apiPathname, queryParameters);
		}
		
	};
})();


var CommentPromiseFactory = (function() {
	var xhrPromiseGet = function(url, headers = null) {
		// Return a new promise.
	    return new Promise(function(resolve, reject) {
	        // Do the usual XHR stuff
	        var req = new XMLHttpRequest();
	        req.open('GET', url);
	        if(headers){
				for(let i in headers){
					req.setRequestHeader(i, headers[i]);
				}
			}
			
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
	};

	var getJSON = function(url, headers = null) {
	 	return CommentPromiseFactory.xhrPromiseGet(url, headers).then(JSON.parse);
	};

	var getArticleDataXhr = function(starterId) {
		var url = CommentApiURLFactory.getAPIArticleURLFromID(starterId),
			articleData = { };
			// { 
			// 	staffScreenNames: { }, 
			// 	replyCount: null,
			// 	starterId: null
			// };

		return CommentPromiseFactory.getJSON(url).then(function(response) {
			//console.log('response:', response);
			var data = response.data,
				authors = data.authors;

			for (var attr in data) {
				articleData[attr] = data[attr];
			}
			articleData.staffScreenNames = { };

			// articleData.replyCount = data.replyCount;
			// articleData.starterId = data.starterId;
	
			for (var i in authors) {
				articleData.staffScreenNames[authors[i].screenName] = 1;
			}

			//console.log('articleData:', articleData);
			
			return articleData;
		});
	};
	var getCommentDataXhr = function(starterId) {
		var url = CommentApiURLFactory.getAPIArticleURLFromID(starterId);
		
		return CommentPromiseFactory.getJSON(url).then(function(response) {
			return response.data;
		});
	};
	// 0.0.1.8
	var getStaffListDataXhr = async function(authorId, starterId) {
		var url = CommentApiURLFactory.getStaffRepliesURL(authorId, false, starterId);
			staffCommentIds = new Map(),
			more = false;
		do {
			await CommentPromiseFactory.getJSON(url).then(function(response) {
				var items = response.data.items;
				for(var i = 0; i < items.length; ++i){
					for(var j = 0; j < items[i].length; ++j){
						staffCommentIds.set(parseInt(items[i][j].id), 1);
					}
				}
				if(response.data.pagination.next){
					more = true;
					url = CommentApiURLFactory.getStaffRepliesURL(authorId, response.data.pagination.next.refId, starterId);
				} else {
					more = false;
				}
			 }, async function(err){
				 console.log("Kinjamprove: Failed to retrieve staff list. Using backup.")
				 more = false;
				 staffCommentIds = await getCuratedListDataXhr(starterId, authorId, false);
			 });
		} while(more);
		return staffCommentIds; 
	};
	// 0.0.1.8
	var getCuratedListDataXhr = async function(starterId, userIds, refId) {
		// getCuratedRepliesURL: function(starterId, maxReturned, cacheIt, refId, userIds)
		var url = CommentApiURLFactory.getCuratedRepliesURL(userIds, refId, starterId);
			curatedMap = new Map(),
			more = false;
		do {
			await CommentPromiseFactory.getJSON(url).then(function(response) {
				var items = response.data.items;
				for(var i = 0; i < items.length; ++i){
					for(var j = 0; j < items[i].length; ++j){
						curatedMap.set(items[i][j].id, items[i][j].directReplyCount);
					}
				}
				if(response.data.pagination.next){
					more = true;
					url = CommentApiURLFactory.getCuratedRepliesURL(userIds, response.data.pagination.next.refId, starterId);
				} else {
					more = false;
				}
			 }, function(err){
				 console.log("Kinjamprove: Error retrieving curated replies");
				 more = false;
			 });
		} while(more);
		return curatedMap; 
	};
	
	
	var xhrPromisePost = function(url, payload) {
		// Return a new promise.
	    return new Promise(function(resolve, reject) {
	        // Do the usual XHR stuff
	        var req = new XMLHttpRequest();
	        req.open('POST', url);
			
			req.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
			
	        req.onload = function() {
	            // This is called even on 404 etc.
	            // so check the status
	            if (req.status === 200) {
	                // Resolve the promise w/ the response text
	                resolve(req.response);
	            } else {
	                // Otherwise reject w/ the status text
	                // which will hopefully be a meaningful error
					reject(req.responseText);
	            }
	        };
	        
	        // Handle network errors
	        req.onerror = function() {
	            reject(Error('Network Error'));
	        };
	        
	        // Make the request!
	        req.send(payload);
	    });
	};

	var postJSON = function(url, payload) {
		return xhrPromisePost(url, payload).then(JSON.parse);
	};
	
	var getItemsPromise = function(url) {
		return CommentPromiseFactory.getJSON(url).then(function(response) {
			return response.data.items;
		}); 
	};

	var getFlatRepliesXhr = function(url) {
		return CommentPromiseFactory.getJSON(url).then(function(response) {
	    	return response.data.items[0];
		});
	};

	var likeCommentPromise = function(url, payload) {
		var postId;

		if (!isNaN(Number.parseInt(url))) {
			postId = Number.parseInt(url);

			url = CommentApiURLFactory.getLikeCommentURL(postId);
		} else {
			var postIdMatch = url.match(/([0-9]*)\/likeAndApprove/);
			postId = postIdMatch[postIdMatch.length-1];
		}

		payload = payload || { postId: postId };

		return CommentPromiseFactory.postJSON(url, payload);

		// if (isNaN(Number.parseInt(url))) {
		// 	return CommentPromiseFactory.getJSON(url);
		// } else {
		// 	var postId = Number.parseInt(url),
		// 		likeCommentURL = CommentApiURLFactory.getLikeCommentURL(postId);

		// 	return CommentPromiseFactory.getJSON(likeCommentURL);
		// }
	};

	return {                               
		getStaffListDataXhr: getStaffListDataXhr,
		getCommentDataXhr: getCommentDataXhr,
		xhrPromiseGet: xhrPromiseGet,
		xhrPromisePost: xhrPromisePost,
		getJSON: getJSON,
		postJSON: postJSON,
		getArticleDataXhr: getArticleDataXhr,
		getItemsPromise: getItemsPromise,
		getFlatRepliesXhr: getFlatRepliesXhr,
		likeCommentPromise: likeCommentPromise
	};
})();


function xhrPromisePost(url, payload, headers = null) {
	// Return a new promise.
    return new Promise(function(resolve, reject) {
        // Do the usual XHR stuff
        var req = new XMLHttpRequest();
        req.open('POST', url);
		
		req.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
		
		if(headers){
			for(let i in headers){
				req.setRequestHeader(i, headers[i]);
			}
		}
		
        req.onload = function() {
            // This is called even on 404 etc.
            // so check the status
            if (req.status === 200) {
                // Resolve the promise w/ the response text
                resolve(req.response);
            } else {
                // Otherwise reject w/ the status text
                // which will hopefully be a meaningful error
//                 reject(Error(req.statusText));
				reject(req.responseText);
            }
        };
        
        // Handle network errors
        req.onerror = function() {
            reject(Error('Network Error'));
        };
        
        // Make the request!
        req.send(payload);
    });
}

function postJSON(url, payload, headers = null) {
	return xhrPromisePost(url, payload, headers).then(JSON.parse);
}

function postCreateComment(postBody, defaultBlogId, images, original, parentId, token, hidePendingReplies) {
	var url = CommentApiURLFactory.getCreateCommentURL(parentId, hidePendingReplies),
		requestPayload = { 
			body: postBody, 
			defaultBlogId: defaultBlogId, 
			images: images, 
			original: original, 
			parentId: parentId, 
			token: token 
		},
		requestPayloadStr = JSON.stringify(requestPayload);
		
		return postJSON(url, requestPayloadStr, {'Authorization':'Bearer '+token});
}


function createComment(postBody, defaultBlogId, images, original, parentId, token, hidePendingReplies) {
	return postCreateComment(
			postBody, 
			defaultBlogId, 
			images,
			original, 
			parentId, 
			token, 
			hidePendingReplies)
		.then(function(response) {
			var publishedReply = response.data.decoratedPost,
				$publishedReplyLi;

			publishedReply.likes = 0;
			publishedReply.replyCount = 0;
			publishedReply.isStarter = false;

			var screenName = publishedReply.author ? publishedReply.author.screenName : '',
				starterId = publishedReply.starterId,
				commentTracker = kinjamprove.commentTrackers[starterId],
				newComment = new Comment(publishedReply),
				parentComment = commentTracker.commentsMap.get(newComment.parentId),
				repliesToAdd = {n:1, a: 0, s: 0, p: 0, type: 0},
				$parentPost = commentTracker.commentArticles[newComment.parentId];
			
			newComment.articleClass = 'reply js_reply kinjamprove-user-comment';
			newComment.isUserComment = true;
			newComment.authorIsStaff = commentTracker.userIsStaff;
			
			if(newComment.authorIsStaff){
				newComment.articleClass += ' kinjamprove-staff';
				newComment.articleTitle = "Staff";
			}
			
			if (parentComment) {
				newComment.threadId = parentComment.threadId;
			}else{
				newComment.threadId = newComment.id;
			}
			
			if(newComment.approved){
				commentTracker.approvedCommentIds.push(newComment.id);
				repliesToAdd.a = 1;
				repliesToAdd.type = 1;
				if (commentTracker.userIsAuthor) {
					repliesToAdd.s = 1;
					repliesToAdd.type = 2;
					newComment.staffCuratedReply = true;
					newComment.articleClass += ' kinjamprove-staff-curated';
					commentTracker.staffCommentIdsMap.set(newComment.id, 1);
				}
			}else{
				newComment.articleClass += ' kinjamprove-unapproved';
				commentTracker.pendingCommentIds.push(newComment.id);
				repliesToAdd.p = 1;
			}
			
			var threadCount = commentTracker.commentsPerThread.get(newComment.threadId);
			
			if(!threadCount){
				threadCount = {all: 1, staff: 0, pending: 0, approved: 0, user: 1, flagged: 0, liked: 0, followed: 0, curated: 0};
				commentTracker.commentsPerThread.set(newComment.threadId, threadCount);
			}else{
				commentTracker.subtractFromVisibleCount(commentTracker.totalVisible, threadCount);
				++threadCount.all;
				++threadCount.user;				
			}
			

			if(parentComment){
				if(!newComment.replyMeta){
					newComment.replyMeta = {};
					newComment.replyMeta.parentAuthor = parentComment.author;
					newComment.replyMeta.showParentByline = parentComment.showByline;
					newComment.replyMeta.parentByline = parentComment.byline;
				}
				if(newComment.approved && parentComment.approved){
					++parentComment.directApprovedReplyCount;
					if (newComment.staffCuratedReply && parentComment.staffCuratedReply) {
						++parentComment.directStaffReplyCount;
					}
				}
				++parentComment.directReplyCount;
				
				newComment.depth = parentComment.depth + 1;
				parentComment.replies.push(newComment);
				newComment.updateThreadForNewComment(commentTracker, repliesToAdd);
			}else{
				if(!newComment.replyMeta){
					var articleData = kinjamprove.kinja;
					newComment.replyMeta = {};
					newComment.replyMeta.parentAuthor = articleData.meta.post.author;
					newComment.replyMeta.showParentByline = true;
					newComment.replyMeta.parentByline = articleData.meta.post.byline;
				}
				newComment.depth = 0;
				commentTracker.threadMap.set(newComment.threadId, newComment);
			}
			
			threadCount.approved += repliesToAdd.a;
			threadCount.pending += repliesToAdd.p;
			threadCount.staff += repliesToAdd.s;
			commentTracker.addToVisibleCount(commentTracker.totalVisible, threadCount);

			let baseComment = commentTracker.commentsMap.get(newComment.threadId);
			
			commentTracker.loadedThreads.set(newComment.threadId, baseComment);
			commentTracker.threadTypes.user.set(newComment.threadId, baseComment);
			if(newComment.staffCuratedReply){
				commentTracker.threadTypes.staff.set(newComment.threadId, baseComment);
			}
			
			commentTracker.userCommentIds.push(newComment.id);
			commentTracker.commentsMap.set(newComment.id, newComment);
			if(commentTracker.authorMap.has(newComment.authorId)){
				let authorComments = commentTracker.authorMap.get(newComment.authorId);
				
				authorComments.push(newComment.id);
			}else{
				commentTracker.authorMap.set(newComment.authorId, [newComment.id]);
			}
			
			if ($parentPost && $parentPost.length) {
				var $editorPlaceholder = $parentPost.siblings('.js_editor-placeholder'),
					parentDepth = Number.parseInt($parentPost.attr('depth'));
				$publishedReplyLi = createCommentListItem(newComment);
				//console.log('publishedReply:', newComment,'$publishedReply:', $publishedReplyLi);		
				$editorPlaceholder.after($publishedReplyLi);
				commentTracker.userUnhiddenArticleMap.set(newComment.id, [$parentPost, 'li[data-id="'+newComment.id+'"]']);							
			} else {
				var $commentList = commentTracker.$commentList;

				$publishedReplyLi = createCommentListItem(newComment);
				$commentList.prepend($publishedReplyLi);
			}
			
			var expirationTimeMillis = newComment.publishTimeMillis + 10000; //(1000 * 60 * 15);
			var $dropdown = $publishedReplyLi.find('ul.kinjamprove-comment-dropdown');
			
			$dropdown.attr('data-edit-expires-millis', expirationTimeMillis);

			commentTracker.updateFilterSelect("newUserComment");
			return newComment;
			// The return value isn't used for anything currently.
		}, function(error){
			console.log('Kinjamprove: Error creating new post', error);
			alert('Kinjamprove: Error posting comment. Please contact developer if problem persists.');
		});
}

function postDeleteComment(postId, kinjaToken) {
	var url = CommentApiURLFactory.getDeleteCommentURL(postId),
		payload = JSON.stringify({ id: postId});

	return postJSON(url, payload, {'Authorization': 'Bearer '+kinjaToken});
}

function deleteComment(postId, kinjaToken) {
	postDeleteComment(postId, kinjaToken).then(function(deletedComment) {
		var deletedCommentId = deletedComment.data.id,
			starterId = deletedComment.data.starterId,
			tracker = kinjamprove.commentTrackers[starterId],
			$commentLi = tracker.commentLis[deletedCommentId],
			successMessage = 'Successfully deleted comment w/ id ' + deletedCommentId + '!:',
			comment = tracker.commentsMap.get(deletedCommentId),
			threadId = comment.threadId,
			threadCount = tracker.commentsPerThread.get(threadId),
			threadTypes = tracker.threadTypes;
		
		tracker.subtractFromVisibleCount(tracker.totalVisible, threadCount);
		--threadCount.all;
		--threadCount.user;
		--threadCount.staff;
		
		if(comment.likedByUser){
			tracker.userLikedCommentIds = 
				tracker.userLikedCommentIds.filter(function(value){
					if(value == deletedCommentId){
						return false;
					}else{
						return true;
					}
				});
				
			--threadCount.liked;
		}
		if(comment.curated){
			--threadCount.curated;
			tracker.curatedCommentLoaded = false;
			tracker.notArticle = false;
		}

		let parentComment = tracker.commentsMap.get(comment.parentId);
		
		if(parentComment){
			parentComment.directApprovedReplyCount ? parentComment.directApprovedReplyCount - 1 : 0;
			parentComment.directStaffReplyCount ? parentComment.directStaffReplyCount - 1 : 0;
			parentComment.directReplyCount ? parentComment.directReplyCount - 1 : 0;
			comment.updateThreadForDeletedComment(tracker);
			for(let i = 0; i < parentComment.replies.length; ++i){
				if(parentComment.replies[i].id == deletedCommentId){
					parentComment.replies.splice(i,1);
					break;
				}
			}
		}else{
			tracker.threadMap.delete(threadId);
			tracker.loadedThreads.delete(threadId);
		}
		

		if(!threadCount.staff){
			threadTypes.staff.delete(threadId);
		}
		if(!threadCount.user){
			threadTypes.user.delete(threadId);
		}
		if(!threadCount.liked){
			threadTypes.liked.delete(threadId);
		}
		if(!threadCount.curated){
			threadTypes.curated.delete(threadId);
		}
		if(threadCount.all){
			tracker.addToVisibleCount(tracker.totalVisible, threadCount);
		}

		tracker.staffCommentIdsMap.delete(deletedCommentId);
		tracker.userCommentIds = 
			tracker.userCommentIds.filter(function(value){
				if(value == deletedCommentId){
					return false;
				}else{
					return true;
				}
			});
			
		tracker.approvedCommentIds = 
			tracker.approvedCommentIds.filter(function(value){
				if(value == deletedCommentId){
					return false;
				}else{
					return true;
				}
			});

		tracker.commentsMap.delete(deletedCommentId);
		
		console.log(successMessage, deletedComment);
		
		tracker.commentLis[deletedCommentId] = undefined;
		tracker.commentArticles[deletedCommentId] = undefined;
		$commentLi.remove();
		tracker.commentListArticlesDescendantMap.delete(deletedCommentId);
		tracker.userUnhiddenArticleMap.delete(deletedCommentId);
		tracker.updateFilterSelect("newUserComment");
	}).catch(function(error) {
		console.error('Failed to  delete post due to error:', error);
	});
}

function getUpdateCommentURL(postId) {
	return window.location.origin + '/api/core/post/' + postId + '/update?';
}

function getCreateCommentURL(parentId, hidePendingReplies) {
	var origin = window.location.origin,
		apiPathname = '/api/core/post/' + parentId + '/replyWithApprovals',
		queryStrParameters = '?hidePendingReplies=' + hidePendingReplies,
		createCommentURL = origin + apiPathname + queryStrParameters;
		
	return createCommentURL;
}

function getDeletePostURL(postId) {
	var origin = window.location.origin,
        apiPathname = '/api/core/post/' + postId + '/delete',
        deletePostURL = origin + apiPathname;

    return deletePostURL;
}
/* Deprecated
function getDismissPostURL(postId, defaultBlogId, kinjaToken) {
	var origin = window.location.origin,
        apiPathname = '/ajax/post/' + postId + '/dismiss/' + defaultBlogId,
        queryStrParameters = '?token=' + kinjaToken,
        url = origin + apiPathname + queryStrParameters;

    return url;
}
*/

function postUpdateComment(postId, $textEditor, parentCommentId) {
	var url = CommentApiURLFactory.getUpdateCommentURL(postId),
		payload = getCreateCommentPayload($textEditor, parentCommentId);
	
	return postJSON(url, payload, {'Authorization':'Bearer '+Utilities.getKinjaToken()});
}

function updateComment(postId, $textEditor, parentCommentId) {
	$textEditor = $textEditor || $('div.editor');
	parentCommentId = parentCommentId || $textEditor.closest('.js_discussion-region').prev().find('article').attr('data-id');
	
	return postUpdateComment(postId, $textEditor, parentCommentId)
		.then(function(response) {
			var updatedComment = response.data,
				$originalComment = $('#reply_'+postId),
				$replyContentDiv = $originalComment.find('div.js_reply-content'),
				updatedCommentBody = createPostBody(updatedComment);
				
			$replyContentDiv.empty().append(...updatedCommentBody);

			return updatedComment;
		}, function(error){
			console.log('Kinjamprove: Error updating comment ', error);
			alert("Kinjamprove: Error updating comment. If this problem persists, please contact the developer.");
		});
}

function getCreateCommentPayload($textEditor, parentCommentId) {
	$textEditor = $textEditor || $('div.scribe');

	return JSON.stringify({ 
		body: CommentEncoder.exportPost($textEditor), 
		defaultBlogId: Utilities.getUserDefaultBlogId(), 
		images: [],
		original: $('textarea:hidden').val(),
		parentId: parentCommentId,
		token: Utilities.getKinjaToken(), 
	});
}
