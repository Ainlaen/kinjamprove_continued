const KINJAMPROVE_WINDOW_VARIABLES_CONTAINER_ID = 'kinjamprove-window-variables-container';
const KINJAMPROVE_WINDOW_VARIABLES_CONTAINER_SELECTOR = '#' + KINJAMPROVE_WINDOW_VARIABLES_CONTAINER_ID;


var Utilities = (function() {
	const CHROME_EXTENSION_BASE_URL = 'chrome-extension://' + chrome.runtime.id + '/';

	var kinjamproveWindowVariablesContainer = 
				document.getElementById(KINJAMPROVE_WINDOW_VARIABLES_CONTAINER_ID),
		kinjamproveWindowVariablesContainerJSON;

	
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
			var blogOwnerId = 
				Utilities.getKinjamproveWindowVariablesContainerJSON().kinja.meta.blogOwner.id;

			return blogOwnerId === Utilities.getUserAuthorId();
		},

		commentIsDeletableByUser: function(comment) {
			return Utilities.userIsCommentAuthor(comment) && 
				   Utilities.commentPublishedInLastFifteenMinutes(comment)
				   && Utilities.userIsBlogOwner();
		},

		commentPublishedInLastFifteenMinutes: function(comment) {
			return Date.now() < comment.publishTimeMillis + minutesToMillis(15);
			
			 function minutesToMillis(minutes) {
		        var seconds = minutes * 60,
		            millis = seconds * 1000;

		        return millis;
		    }
		},

		commentIsEditableByUser: function(comment) {	
			return (Utilities.userIsCommentAuthor(comment) && 
						(
							// comment.depth === 0 ||
							Utilities.commentPublishedInLastFifteenMinutes(comment)
						)
				);
		},

		setWindowConfirmToAutomatic: function() {
			if (!window.realConfirm) {
				window.realConfirm = window.confirm;
			}

			window.confirm = function() {
				console.log('Confirming automatically.');
				return true;
			};
		},
		
		setWindowConfirmToNormal: function() {
			window.confirm = window.realConfirm || window.confirm;
		},
		
		getKinjamproveWindowVariablesContainerJSON: function() {			

			return kinjamproveWindowVariablesContainerJSON 
				? kinjamproveWindowVariablesContainerJSON
				// : JSON.parse(document.getElementById(KINJAMPROVE_WINDOW_VARIABLES_CONTAINER_ID).textContent)
				: JSON.parse(document.getElementById(KINJAMPROVE_WINDOW_VARIABLES_CONTAINER_ID).value)
		},
		
		getKinjaToken: function() {
			return Utilities.getKinjamproveWindowVariablesContainerJSON().token.token;
		},
		
		
		getUserDefaultBlogId: function() {
			return Utilities.getKinjamproveWindowVariablesContainerJSON().accountState.defaultBlogId;	
		},

		getUserAuthorId: function() {
			return Utilities.getKinjamproveWindowVariablesContainerJSON().accountState.authorId;
		},

		userFlaggedPost: function(postId) {
			return kinjamprove.userFlaggedPostIdsMap.hasOwnProperty(postId);
		},
		
		storeVariables: function() {
			console.log('Utilities.storeVariables()');
			var kinja = window.kinja,
				userData = window._user.data,
				accountState = userData.accountState,
				token = userData.token,
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
			
			console.log('getLikesOfUserUnderStarter called w/ starterId=' + starterId);
			
			var origin = window.location.origin,
				token = Utilities.getKinjaToken(),
				likesOfUserUnderStarterUrl = origin +
					'/api/likes/views/likesOfUserUnderStarter?token=' + 
					token + '&starterId=' + starterId;

			return likesOfUserUnderStarterUrl;
		},

		getFlagsOfUserUnderStarterURL: function(starterId) {
			if (!arguments.length) {
				starterId = Utilities.getStarterIdOfFirstStory();
			}
			
			var origin = window.location.origin,
				flaggedPostsPathname = '/api/moderation/flagging/views/flagsByStarter',
				token = Utilities.getKinjaToken(),
				flaggedPostsQueryStr = '?token=' + token + '&starterId=' + starterId,
				flagsOfUserUnderStarterUrl = 
					origin + flaggedPostsPathname + flaggedPostsQueryStr;

			return flagsOfUserUnderStarterUrl;
		},

		setWindowOnbeforeunload() {
			console.log('Utilities.setWindowOnbeforeunload');
			
			window.onbeforeunload = function() {
				console.log('kinjamprove window.onbeforeunload');
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

			var apiPathname = '/api/comments/views/replies/' + articleId,
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

		getDeleteCommentURL: function(postId, kinjaToken) {
			kinjaToken = kinjaToken || Utilities.getKinjaToken();

			var apiPathname = '/api/core/post/' + postId + '/delete',
				queryParameters = { token: kinjaToken };

        	return createURL(apiPathname, queryParameters);
		},

		getDismissPostURL: function(postId, defaultBlogId, kinjaToken) {
			defaultBlogId = defaultBlogId || Utilities.getUserDefaultBlogId();
			kinjaToken = kinjaToken || Utilities.getKinjaToken();
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

		getStaffRepliesURL: function(staffMemberName, starterId, maxReturned, cacheIt) {
			starterId = starterId || Utilities.getStarterIdOfFirstStory();
			maxReturned = maxReturned || MAX_NUM_OF_COMMENTS_PER_REQUEST;
			cacheIt = cacheIt || true;
			
			// url = 'https://www.avclub.com/api/comments/views/curatedReplies/1798398429?query=seanoneal&maxReturned=5&cache=true&refId=1798521900';
		    var apiPathname = '/api/comments/views/curatedReplies/' + starterId, 
		    	queryParameters = { 
		    		query: staffMemberName, 
		    		maxReturned: maxReturned,
		    		cache: cacheIt
		    	};
							    
		    return createURL(apiPathname, queryParameters);
		}
	};
})();


var CommentPromiseFactory = (function() {
	var xhrPromiseGet = function(url) {
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
	};

	var getJSON = function(url) {
	 	return CommentPromiseFactory.xhrPromiseGet(url).then(JSON.parse);
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
			console.log('response:', response);
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

			console.log('articleData:', articleData);
			
			return articleData;
		});
	};
	var getCommentDataXhr = function(starterId) {
		var url = CommentApiURLFactory.getAPIArticleURLFromID(starterId);
		
		return CommentPromiseFactory.getJSON(url).then(function(response) {
			return response.data;
		});
	};
	
	var getCuratedListDataXhr = async function(screenName, starterId) {
		var url = CommentApiURLFactory.getStaffRepliesURL(screenName, starterId);
			staffMap = new Map();
		staffMap = await CommentPromiseFactory.getJSON(url).then(function(response) {
			var items = response.data.items;
			for(var i = 0; i < items.length; ++i){
				for(var j = 0; j < items[i].length; ++j){
					staffMap.set(items[i][j].id, items[i][j].directReplyCount);
				}
			}

			return staffMap;
		});

		return staffMap; 
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
	};

	var postJSON = function(url, payload) {
		return xhrPromisePost(url, payload).then(JSON.parse);
	};
	
	var getItemsPromise = function(url) {
		return CommentPromiseFactory.getJSON(url).then(function(response) {
			var items = response.data.items,
				promises = [];
			for(var i = 0; i < items.length; i++){
				promises.push(getCommentDataXhr(items[i].reply.id));
				for(var j = 0; j < items[i].children.items.length; j++){
					promises.push(getCommentDataXhr(items[i].children.items[j].id));
				}
			}
			return Promise.all(promises).then(function(responses){
				var i = 0,
					j = 0;
					//savedID;
				responses.forEach(function(response){
					
					if(!items[i].reply.body){
						//savedID = parseInt(items[i].reply.id);
						for(var attr in response){
							items[i].reply[attr] = response[attr];
						}
						//items[i].reply.id = savedID;
					}else{
						//savedID = parseInt(items[i].children.items[j].id);
						for(var attr in response){
							items[i].children.items[j][attr] = response[attr];
						}
						//items[i].children.items[j].id = savedID;
						j++;
					}
					if(!(j < items[i].children.items.length)){
						j = 0;
						i++;
					}
				});
				return items;
			});
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
		getCuratedListDataXhr: getCuratedListDataXhr,
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


// function followingAuthor(authorId) {
// 	return kinjamprove.accountState.followedAuthorIds.hasOwnProperty(authorId);
// }

function xhrPromisePost(url, payload) {
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

function postJSON(url, payload) {
	return xhrPromisePost(url, payload).then(JSON.parse);
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
		
		return postJSON(url, requestPayloadStr);
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
				$parentPost = $('#reply_'+parentId),
				$publishedReply;
				CommentPromiseFactory.getArticleDataXhr(publishedReply.id).then(function(response){
					publishedReply.replyMeta = response.replyMeta;
					return publishedReply;
				})
				.then(function(publishedReply){
				
					if ($parentPost.length) {
						var $editorPlaceholder = $parentPost.siblings('.js_editor-placeholder'),
							parentDepth = Number.parseInt($parentPost.attr('depth'));

						publishedReply.depth = parentDepth + 1;
						$publishedReply = createCommentListItem(publishedReply);
						console.log('publishedReply:', publishedReply,'$publishedReply:', $publishedReply);		
						$editorPlaceholder.after($publishedReply);
					} else {
						var $commentList = 
							$('section.js_discussion-region[starter-id="' + parentId + '"]')
								.find('ul.commentlist');

						publishedReply.depth = 0;
						$publishedReply = createCommentListItem(publishedReply);
						$commentList.prepend($publishedReply);
					}

					var expirationTimeMillis = publishedReply.publishTimeMillis + 10000; //(1000 * 60 * 15);
					var $dropdown = $publishedReply.find('ul.kinjamprove-comment-dropdown');
					$dropdown.attr('data-edit-expires-millis', expirationTimeMillis);
					console.log('$dropdown:', $dropdown);
					return publishedReply;
				});


				return publishedReply;
		});
}

function postDeleteComment(postId, kinjaToken) {
	var url = CommentApiURLFactory.getDeleteCommentURL(postId, kinjaToken),
		payload = JSON.stringify({ id: postId });

	return postJSON(url, payload);
}

function deleteComment(postId, kinjaToken) {
	postDeleteComment(postId, kinjaToken).then(function(deletedComment) {
		var deletedCommentId = deletedComment.data.id,
			$commentLi = $('#reply_' + deletedCommentId).parent(),
			successMessage = 'Successfully deleted comment w/ id ' + deletedCommentId + '!:';

		console.log(successMessage, deletedComment);
		$commentLi.remove();
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

function getDeletePostURL(postId, kinjaToken) {
	var origin = window.location.origin,
        apiPathname = '/api/core/post/' + postId + '/delete',
        queryStrParameters = '?token=' + kinjaToken,
        deletePostURL = origin + apiPathname + queryStrParameters;

    return deletePostURL;
}
/*
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
	
	return postJSON(url, payload);
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
// 0.0.1.8
/*
function postDismissComment(postId, defaultBlogId, kinjaToken) {
	var url = 'https://kinja.com/api/profile/token/createSecure',
		payload = {};
	//JSON.stringify({ token: kinjaToken });
	
	return postJSON(url, payload)
		.then(function(response) {
			var secureToken = response.data.token;
			payload = JSON.stringify({postId: postId});
			url = CommentApiURLFactory.getDismissPostURL(postId, defaultBlogId, kinjaToken);
			return CommentPromiseFactory.postJSON(url, payload, secureToken);
		});
}
*/