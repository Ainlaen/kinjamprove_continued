function CommentEditorAPI($discussionRegion) {
    if (!arguments.length || !$discussionRegion) {
        $discussionRegion = $('#js_discussion-region');
    }
    
    var $nativeReplyButtonContainer = $discussionRegion.find('.replies-wrapper > div.reply-to-post__container').first();

    this.$discussionRegion = $discussionRegion;
    this.$nativeReplyButton = $nativeReplyButtonContainer.children('button');
    this.$placeholder = $nativeReplyButtonContainer.nextAll('.js_editor-placeholder:first');
    this.$placeholderPrevSibling = this.$placeholder.prev();
    this.$editor = null;
    this.$scribe = null;
    this.$kinjamproveReplyButton = null;
    this.$nativeCancelButton = null;
    this.$kinjamproveCancelButton = null;
    this.$kinjamprovePublishButton = null;
    this.$kinjamproveAutoCancelButton = null;
    this.replyOrEdit = null;
}

CommentEditorAPI.prototype = {
    constructor: CommentEditorAPI,

    hideNativePlaceholder: function() {
        console.log('hideNativePlaceholder');
        this.$placeholder.hide();
    },

     clickReplyToBlogButton: function() {
        console.log('clicking native reply button');
        this.$nativeReplyButton[0].click();

    },

     appendNativePlaceholderToCommentPlaceholder: function($comment) {
        console.log('appendNativePlaceholderToCommentPlaceholder; $comment:', $comment);
        if (typeof $comment === 'object') {
            $comment.nextAll('.js_editor-placeholder').append(this.$placeholder);
        }
    },

    clickKinjamproveCancelButton: function() {
        this.$kinjamproveCancelButton[0].click();
    }, 

    clickKinjamprovePublishButton: function() {
        this.$kinjamprovePublishButton[0].click();        
    },
     
    clickKinjamproveAutoCancelButton: function() {
        this.$kinjamproveAutoCancelButton[0].click();        
    }, 

    closeEditor: function() {
        if (!this.$editor) {
            this.$editor = $('div.editor');
            if (!this.$editor) {
                return;
            }

            this.addAutomaticCancelButton();
        }
        
        this.clickKinjamproveAutoCancelButton();
        this.reset();
    },

    attachEditorToComment: function($comment, replyOrEdit) {
        console.log('attachEditorToComment called');

        if (typeof $comment === 'object' && 
                $comment.siblings('.js_editor-placeholder').children('.editor').length) {
            console.log('This comment already has editor');
            this.focusEditorInnerScribe();
            return;
        }

        if (this.$editor && this.$editor.length) {
            console.log('Attaching pre existing editor to comment');
            this.attachPreExistingEditorToComment($comment, replyOrEdit);
        }
        else {
            console.log('Attaching new editor to comment');
            this.attachNewEditorToComment($comment, replyOrEdit);
        }
    }, 

    attachPreExistingEditorToComment: function($comment, replyOrEdit) {
        const CONFIRM_EDITOR_CLOSE_MESSAGE = 'Kinjamprove: Closing the editor will discard any unsaved changes to this post. Is that OK?';
        var confirmEditorClose = (this.getEditorInnerScribe().text().length)
            ? window.confirm(CONFIRM_EDITOR_CLOSE_MESSAGE)
            : true;
        
        if (!confirmEditorClose) {
            return;
        }

        this.replyOrEdit = replyOrEdit || 'reply';
        this.detachEditorAndResetText();
        this._attachEditorToComment($comment);
    },

    attachNewEditorToComment: function($comment, replyOrEdit) {
        //      Step 1.
        // Hide the native editor placeholder
        this.hideNativePlaceholder();

        //      Step 2. 
        // Click reply to blog button
        this.clickReplyToBlogButton();

        //      Step 3.
        // Append the (now-hidden) native editor placeholder
        // to the comment's editor placeholder. 
        this.appendNativePlaceholderToCommentPlaceholder($comment);

        //      Step 4.
        // Use requestAnimationFrame to wait for the native editor 
        // placeholder to have children (i.e. the editor), then
        // add Kinjamprove Publish & Kinjamprove Cancel buttons,
        // move the $editor from the $nativeEditorPlaceholder
        // to the $editorPlaceholder, and display the $editorPlaceholder.
        // Then return $nativeEditorPlaceholder to its origin.
        var commentEditorAPI = this,
            animationStartTime = window.performance.now();

        requestAnimationFrame(placeholderHasEditor);

        function placeholderHasEditor() {
            var $editor = commentEditorAPI.$placeholder.children('.editor'),
                currentTime = window.performance.now(),
                timeElapsed = currentTime - animationStartTime;

            if ($editor.length) {
                console.log('$nativeEditorPlaceholder has children; timeElapsed:', timeElapsed);
                commentEditorAPI.replyOrEdit = replyOrEdit || 'reply';
                commentEditorAPI.$editor = $editor;
                commentEditorAPI.$scribe = commentEditorAPI.getEditorInnerScribe();
                commentEditorAPI.addKinjamprovePublishCommentButton();
                commentEditorAPI.addKinjamproveCancelCommentButton();
                commentEditorAPI.addAutomaticCancelButton();
                commentEditorAPI.$editor.find('button[type="cancel"]').hide();

                commentEditorAPI._attachEditorToComment($comment);
                commentEditorAPI.$placeholder.show();
                commentEditorAPI.$placeholderPrevSibling.after(commentEditorAPI.$placeholder);

                window.cancelAnimationFrame(placeholderHasEditor);
            } else if (timeElapsed >= 15000) {
                console.log('canceling placeholderHasEditor animationFrame b/c it timed out');
                window.cancelAnimationFrame(placeholderHasEditor);
            } else {
                requestAnimationFrame(placeholderHasEditor);
            }
        }
    },

    setDiscussionRegion($discussionRegion) {
        var $nativeReplyButtonContainer = $discussionRegion.find('.replies-wrapper > div.reply-to-post__container').first();

        this.$discussionRegion = $discussionRegion;
        this.$nativeReplyButton = $nativeReplyButtonContainer.children('button');
        this.$placeholder = $nativeReplyButtonContainer.nextAll('.js_editor-placeholder:first');
        this.$placeholderPrevSibling = this.$placeholder.prev();
    },

    _attachEditorToComment: function($comment) {
        var $authorDisplayNameSpan = this.$editor.find('span.js_author-display-name'),//'',
            $commentEditorPlaceholder = '',
            parentDisplayName = '';

        if (typeof $comment === 'object') {
            $commentEditorPlaceholder = $comment.nextAll('.js_editor-placeholder');
            parentDisplayName = $comment.find('.reply__byline > a:first').text();
        } else {
            parentDisplayName = 
                this.$discussionRegion
                    .siblings('section.branch-wrapper')
                    .find('article.post div.meta__byline')
                    .text();
        }

        this.setParentIdInputVal($comment);

        if (this.replyOrEdit === 'edit') {
            $authorDisplayNameSpan.html(parentDisplayName+' <i>(edit)</i>');
            this.$kinjamprovePublishButton.text('Publish Update')

            var $commentBody = $comment.find('div.reply__content')
                $commentBodyChildren = $commentBody.children(),
                commentBodyHTML = $commentBody.html(),
                scribeInsertHTML = '',
                commentEditorAPI = this; 

            $.each($commentBodyChildren, function() {
                var nodeName = this.nodeName.toLowerCase();
                
                if (nodeName === 'figure') {
                    var $this = $(this),
                        $scribeFigure = commentEditorAPI.editPost_figureToScribeHtml($this),
                        scribeFigureHTML = $scribeFigure[0].outerHTML;
                    
                    scribeInsertHTML += scribeFigureHTML;
                } else {
                    scribeInsertHTML += this.outerHTML;
                }
            });

            this.focusEditorInnerScribe();

            setTimeout(function() {
                document.execCommand('insertHTML', true, scribeInsertHTML); 
            }, 0);
                    
        } else {
            if (parentDisplayName.length) {
                $authorDisplayNameSpan.text(parentDisplayName);
            }
            this.$kinjamprovePublishButton.text('Publish Reply')
        }

        if (!$commentEditorPlaceholder.length) {
            $commentEditorPlaceholder = this.$discussionRegion.find('.js_editor-placeholder:first');
            console.log('$commentEditorPlaceholder being set to original:', $commentEditorPlaceholder);
        }

        $commentEditorPlaceholder.append(this.$editor);
        $commentEditorPlaceholder.show();
        
        this.focusEditorInnerScribe();
    },

     addKinjamprovePublishCommentButton: function(onPublishButtonClickCallback) {
        var $nativePublishButton,
            kinjamprovePublishButtonClass = 'kinjamprove-publish-button',
            kinjamprovePublishButtonText = 'Publish ',
            $kinjamprovePublishButton = this.$editor.find('button.'+kinjamprovePublishButtonClass),
            commentEditorAPI = this;

        if ($kinjamprovePublishButton.length) {
            return;
        }

        kinjamprovePublishButtonText += (this.replyOrEdit === 'edit') ? 'Update' : 'Reply';
        $nativePublishButton = this.$editor.find('button.publish');
        $kinjamprovePublishButton = $('<button>', { 
            'class': kinjamprovePublishButtonClass
        }).text(kinjamprovePublishButtonText)
          // .click(onKinjamprovePublishButtonClick);
          .one('click', onKinjamprovePublishButtonClick);
         
        commentEditorAPI.$kinjamprovePublishButton = $kinjamprovePublishButton;
        $nativePublishButton.after($kinjamprovePublishButton);
        $nativePublishButton.hide();

        function onKinjamprovePublishButtonClick() {
            if (commentEditorAPI.replyOrEdit === 'edit') {
                onKinjamprovePublishButtonClick_publishEdit();
            } else {
                onKinjamprovePublishButtonClick_publishReply();
            }
        }


        function onKinjamprovePublishButtonClick_publishReply() {
            console.log('addKinjamprovePublishCommentButton onKinjamprovePublishButtonClick');
            var $textEditor = commentEditorAPI.getEditorInnerScribe(),
                $textArea = $textEditor.siblings('textarea:hidden:first'),
                $parentComment = commentEditorAPI.getAttachedComment(),
                parentCommentId = ($parentComment && $parentComment.length) 
                    ? $parentComment.attr('data-id')
                    : commentEditorAPI.$discussionRegion.attr('starter-id'),
                payload = {
                    body:          CommentEncoder.exportPost($textEditor), 
                    defaultBlogId: Utilities.getUserDefaultBlogId(), 
                    images:        [],
                    original:      $textArea.val(),
                    parentId:      parentCommentId,
                    token:         Utilities.getKinjaToken() 
                };
                
            console.log('payload: ', payload);
            
            /* For debugging so that post doesn't actually get created */
            // if (true) {      
            //     return;
            // }
        
            setTimeout(function() {
                var confirmPublishReply = true;//confirm('Kinjamprove: Are you sure you want to publish this reply?');

                if (confirmPublishReply) {                    
                    createComment(payload.body, payload.defaultBlogId, payload.images, 
                                  payload.original, payload.parentId, payload.token, false)
                        .then(function(response) {
                            console.log('createComment response:', response);
                            // var expirationTimeMillis = publishedReply.publishTimeMillis + 10000; //(1000 * 60 * 15);
                            // var $dropdown = $publishedReply.find('ul.kinjamprove-comment-dropdown');
                            // $dropdown.attr('data-edit-expires-millis', expirationTimeMillis);
                            // console.log('$dropdown:', $dropdown);

                            var starterId = Number.parseInt(commentEditorAPI.$discussionRegion.attr('starter-id'));
                            var commentTracker = kinjamprove.commentTrackers[starterId];
                            var newComment = new Comment(response);
                            // var parentComment = commentTracker.commentsMap[newComment.parentId];
                            var parentComment = commentTracker.commentsMap.get(newComment.parentId);

                            if (parentComment) {
                                newComment.depth = parentComment.depth + 1;
                                parentComment.replies.push(newComment);
                            } else {
                                commentTracker.commentsArr.push(newComment);
                                console.log('commentTracker.commentsArr.length:', commentTracker.commentsArr.length);
                            }

                            // commentTracker.commentsMap[newComment.id] = newComment;
                            commentTracker.commentsMap.set(newComment.id, newComment);
                            commentTracker.totalNumOfComments++;

                            console.log('newComment:', commentTracker.commentsMap.get(newComment.id));

                            commentEditorAPI.closeEditor();
                        }).catch(function(error) {
                            console.error(error);
                            $kinjamprovePublishButton.one('click', onKinjamprovePublishButtonClick);
                        });
                }
            }, 0);
        }

        function onKinjamprovePublishButtonClick_publishEdit() {
            console.log('onKinjamprovePublishButtonClick_publishEdit');

            var $textEditor = commentEditorAPI.getEditorInnerScribe(),
                $commentBeingUpdated = commentEditorAPI.getAttachedComment(),
                commentBeingUpdatedId = $commentBeingUpdated.attr('data-id'),
                parentCommentId = $commentBeingUpdated.attr('data-parentid'),
                payload = getCreateCommentPayload($textEditor, parentCommentId);

            console.log('payload: ', JSON.parse(payload));

            setTimeout(function() {
                var confirmPublishUpdate = true;//confirm('Kinjamprove: Are you sure you want to publish this update?');
                
                if (confirmPublishUpdate) {
                    updateComment(commentBeingUpdatedId, $textEditor, parentCommentId)
                        .then(function(response) {
                            console.log('response:', response);
                            var starterId = Number.parseInt(commentEditorAPI.$discussionRegion.attr('starter-id'));
                            var commentTracker =  kinjamprove.commentTrackers[starterId];
                            // commentTracker.commentsMap[response.id].body = response.body;
                            // commentTracker.commentsMap[response.id].body = response.body;
                            // commentTracker.commentsMap[response.id] = new Comment(response);
                            
                            var commentMapResponse = commentTracker.commentsMap.get(response.id);
                            commentMapResponse.body = response.body;

                            if (!commentTracker.recentlyEditedCommentsMap) {
                                commentTracker.recentlyEditedCommentsMap = { };
                            }
                            commentTracker.recentlyEditedCommentsMap[response.id] = response; //new Comment(response);
                            // console.log('updated comment:', commentTracker.commentsMap[response.id]);
                            console.log('updated comment:', commentTracker.commentsMap.get(response.id));
                            
                           
                            commentEditorAPI.closeEditor();
                        }).catch(function(error) {
                            console.error(error);
                            $kinjamprovePublishButton.one('click', onKinjamprovePublishButtonClick);
                        });
                }
            }, 0);      
        }
    },


    addKinjamproveCancelCommentButton: function() {
        var $nativeCancelButton,
            $kinjamproveCancelButton = this.$editor.find('button.kinjamprove-cancel-button'),
            commentEditorAPI = this;
        
        if ($kinjamproveCancelButton.length) {
            return;
        }
        
        $nativeCancelButton = this.$editor.find('button[type="cancel"]');
        $nativeCancelButton.click(function() {
            console.log('$nativeCancelButton clicked:', $(this));
        });

        $kinjamproveCancelButton = $('<button>', { 
             'class': 'kinjamprove-cancel-button', 
             'onclick': 'onKinjamproveCancelButtonClick(this)'
            })
            .text('Cancel')
            .click(onKinjamproveCancelButtonClick2);
        
        $nativeCancelButton.after($kinjamproveCancelButton);
        
       this.$nativeCancelButton = $nativeCancelButton;
       this.$kinjamproveCancelButton = $kinjamproveCancelButton;

       
       function onKinjamproveCancelButtonClick2() {
            console.log('commentEditorAPI onKinjamproveCancelButtonClick');
       }
    },

    addAutomaticCancelButton: function() {
        const AUTO_CANCEL_BUTTON_CLASS = 'kinjamprove-auto-cancel-button';
        
        if (this.$kinjamproveAutoCancelButton) {
            return;
        }

        var commentEditorAPI = this,
            $kinjamproveAutoCancelButton = $('<button>', { 
                    'class': AUTO_CANCEL_BUTTON_CLASS, 
                    'style': 'display: none;',
                    'onclick': 'onKinjamproveAutoCancelButtonClick()'
                })
                .text('Auto Cancel')
                .click(_onKinjamproveAutoCancelButtonClick);

        this.$editor.find('button[type="cancel"]').after($kinjamproveAutoCancelButton);
        this.$kinjamproveAutoCancelButton = $kinjamproveAutoCancelButton;
        
        this.$kinjamproveAutoCancelButton.click(_onKinjamproveAutoCancelButtonClick);
        
        function _onKinjamproveAutoCancelButtonClick() {
            console.log('_onKinjamproveAutoCancelButtonClick:', this);
            commentEditorAPI.reset();
        }
    },

    editPost_figureToScribeHtml: function($figure) {
        var $scribeFigure,
            $scribeFigureImgWrapperDiv,
            $scribeFigureImg,
            $picture = $figure.find('picture'),
            $img = $picture.find('img'),
            img = $img[0],
            imgId = $img.attr('data-chomp-id'),
            imgFormat = $img.attr('data-format'),
            imgWidth = img.width, 
            imgHeight = img.height,
            imgSrc = $picture.find('source:first').attr('srcset').replace(/(upload)\/.*?\//, '$1/'),
            alignment = $figure.attr('class').split('align--')[1],
            scribeFigureClass = 'align--' + alignment + ' has-image';
            
        imgFormat = imgFormat.charAt(0).toUpperCase() + imgFormat.substring(1);

        $scribeFigureImg = $('<img>', { draggable: false, src: imgSrc });
        $scribeFigureImgWrapperDiv = $('<div>', { 
            'class': 'image-wrapper', 
            contenteditable: false 
        }).append($scribeFigureImg);

        $scribeFigure = $('<figure>', { 
            'class': scribeFigureClass, 
            contenteditable: false, 
            draggable: false, 
            'data-format': imgFormat, 
            'data-id': imgId, 
            'data-width': imgWidth,
            'data-height': imgHeight
        }).append($scribeFigureImgWrapperDiv);
        
        return $scribeFigure;
    },

    setParentIdInputVal: function($comment) {
        var $parentIdInput = this.$editor.find('input[name="parentId"]'),
            parentId = (typeof $comment === 'object') 
                ? $comment.attr('data-id') 
                : Number.parseInt($comment);
            
        $parentIdInput.val(parentId);
    },

    reset: function() {
        console.log('reset called');
       
        this.returnPlaceholderToOrigin();
        this.$editor = null;
        this.$scribe = null;
        this.$kinjamproveAutoCancelButton = null;
        this.$kinjamproveCancelButton = null;
        this.$kinjamprovePublishButton = null;
        this.$nativeCancelButton = null;
        this.$kinjamprovePublishButton = null;
        this.replyOrEdit = null;
    },

    returnPlaceholderToOrigin: function() {
        console.log('returning placeholder to origin');
        this.$placeholderPrevSibling.after(this.$placeholder);
    },

    detachEditorAndResetText: function() {
        this.$editor.detach();
        this.setEditorText('');
    },

    setEditorText: function(text) {
        if (!arguments.length) {
            text = '';
        }

        if (!this.$editor) {
            this.$editor = this.$placeholder.children('.editor');
            
            if (!this.$editor.length) {
                return;
            }

            this.$scribe = $editor.find('div.scribe');
        }

        this.$scribe.text(text);
    },

    getEditorInnerScribe: function() {
        if (!this.$editor) {
            return null;
        }
        if (!this.$scribe) {
            this.$scribe = this.$editor.find('div.scribe');
        }

        return this.$scribe;
    },

    setScribeInnerHTML(html) {
        this.$scribe.html(html);
    },

    focusEditorInnerScribe: function() {
        this.getEditorInnerScribe().focus();
    },

    getAttachedComment: function() {
        var $comment;
        
        if (this.$editor) {
            $comment = this.$editor.parent().siblings('article');
            
            if ($comment.length) {
                return $comment;
            }
        }
        
        return null;
    },
};



var commentEditorAPI;
console.log('commentEditorAPI:', commentEditorAPI);

function onReplyLinkClick(event) {
    console.log('onReplyLinkClick; event:', event);
    event.preventDefault();
    event.stopPropagation();

    var $comment = $(this).closest('article');

    if (!commentEditorAPI) {
        commentEditorAPI = new CommentEditorAPI();
    }

    commentEditorAPI.attachEditorToComment($comment, 'reply');

    setTimeout(function() {
        $('#kinjamprove-window-onbeforeunload-button')[0].click();
    }, 500);
}

function onEditClick(event) {
     console.log('onEditClick; event:', event);

     var $comment = $(this).closest('article');

    if (!commentEditorAPI) {
        commentEditorAPI = new CommentEditorAPI();
    }

    commentEditorAPI.attachEditorToComment($comment, 'edit');
}