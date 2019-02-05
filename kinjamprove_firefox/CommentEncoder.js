var CommentEncoder = (function(){
	const TEXTSTYLE = { 
		BOLD: 'Bold', 
		ITALIC: 'Italic', 
		STRIKE: 'Struck', 
		SMALL: 'Small',
		CODE: 'Code',
		SUBSCRIPT: 'Subscript',
		SUPERSCRIPT: 'Superscript',
		UNDERLINE: 'Underline'
	};

	var _ucfirst = function(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	};

	var  _containsOnlyWhitespace = function(element) {
		var contents = element.innerHTML,
			trimmedContents = contents.replace(/([\u200B-\u200D\uFEFF\s]|<br>)/g, '').trim();

    	return !trimmedContents.length;
	};


	var _nodeNameToStyle = function(nodeName) {
		switch (nodeName) {
			case 'em':
			case 'i':
				return TEXTSTYLE.ITALIC;
			case 'strong':
			case 'b':
				return TEXTSTYLE.BOLD;
			case 's':
			case 'strike':
				return TEXTSTYLE.STRIKE;
			case 'del':
				return TEXTSTYLE.STRIKE;
			case 'small':
				return TEXTSTYLE.SMALL;
			case 'code':
				return TEXTSTYLE.CODE;
			case 'sub':
				return TEXTSTYLE.SUBSCRIPT;
			case 'sup':
				return TEXTSTYLE.SUPERSCRIPT;
			case 'u':
				return TEXTSTYLE.UNDERLINE;
		}
	};

	/* From webpack:// > public/javascripts > app > editor > postbody > inlineNodes.es6 */
	var _TextNode = function(value, styles) {
	    return {
	        type: 'Text',
	        value: value,
	        styles: styles || []
	    };
	};

	/* From webpack:// > public/javascripts > app > editor > postbody > inlineNodes.es6 */
	var _LineBreak = function() {
		return {
			type: 'LineBreak'
		};
	};

	/* From webpack:// > public/javascripts > app > editor > postbody > inlineNodes.es6 */
	var _Link = function(value, reference, target) {
		target = target || null;

		return {
			type: 'Link',
			value: value,
			reference: reference,
			target: target
		};
	};

	var getNodeAlignment = function(node) {
		var alignmentMatch = node.className.match(/align--(\w+)/) || [],
			alignment =  alignmentMatch[1];

	        switch (alignment) {
	            case 'center': return 'Center';
	            case 'right':  return 'Right';
	            default:       return 'Left';
	        }	    
	};


	var renderPostBodyPartImage = function(node) {
	    var $node = $(node),
			$img = $node.find('img'),
			nodeClass = $node.attr('class'),
			imgAlignment = nodeClass.match(/align--[a-z]* /)[0].split('--')[1].trim(),
			imgSrc = $img.attr('src'),
			imgName = imgSrc.substring(imgSrc.lastIndexOf('/')+1),
			imgId = $node.attr('data-id'),
			imgFormat = $node.attr('data-format'),
			imgHeight = Number.parseInt($node.attr('data-height')),
			imgWidth = Number.parseInt($node.attr('data-width')),
			postBodyPart = { };

		imgAlignment = _ucfirst(imgAlignment);
		imgFormat = _ucfirst(imgFormat);

		postBodyPart = {
	        	alignment: imgAlignment,
	        	caption:   [],
	        	format:    imgFormat,
	            height:    imgHeight,
	            id:        imgId,
	            type:      'Image',
	            width:     imgWidth
	        };

	    return postBodyPart;
	};

	/* From webpack:// > public/javascripts > app > editor > postbody > inlineNodeExporter.es6 */
	 var traverseNode = function(node, openStyles, result) {
		openStyles = openStyles || [];
		result = result || [];

		var child = node.childNodes[0];

		while (child) {
			var nodeName = child.nodeName.toLowerCase();

			switch (nodeName) {
				case '#text':
					result.push(_TextNode(child.textContent, openStyles));
					break;
				case 'br':
					result.push(_LineBreak());
					break;
				case 'a':
					var linkContent = traverseNode(child, openStyles, []);
					if (child.getAttribute('href')) {
						(function () {
							var currentLinkContent = [];
							linkContent.forEach(function (node) {
								if (node.type === 'Text') {
									currentLinkContent.push(node);
								} else {
									// Split the link around the invalid content.
									if (currentLinkContent.length > 0) {
										var href = child.getAttribute('href'),
											target = child.getAttribute('target');
										result.push(_Link(currentLinkContent, href, target));
									}
									result.push(node);
									currentLinkContent = [];
								}
							});
							if (currentLinkContent.length > 0) {
								var href = child.getAttribute('href'),
									target = child.getAttribute('target');
								result.push(_Link(currentLinkContent, href, target));
							}
						})();
					} else {
						Array.prototype.push.apply(result, linkContent);
					}
					break;
					
				case 'em':
				case 'i':
				case 'strong':
				case 'b':
				case 's':
				case 'strike':
				case 'del':
				case 'small':
				case 'code':
				case 'sub':
				case 'sup':
				case 'ins':
				case 'u':
					traverseNode(child, openStyles.concat(_nodeNameToStyle(nodeName)), result);
					break;
				default:
					traverseNode(child, openStyles, result);
					break;
			}

			child = child.nextSibling;
		}

		return result;
	};

	/* From webpack:// > public/javascripts > app > editor > postbody > blockNodeExporter.es6 */
	/**
	 * @param {Node} node - DOM node to export to Paragraph
	 * @param {Container[]} containers - list of container nodes to apply
	 */
	var exportParagraph = function(node, containers) {
		containers = containers || [];

		if (_containsOnlyWhitespace(node)) {
			return null;
		}
		
		var inlineNodes = traverseNode(node);
		if (!inlineNodes.length) {
			return null;
		}

		return {
			value: inlineNodes,
			containers: containers,
			type: 'Paragraph'
		};
	};

	/* From webpack:// > public/javascripts > app > editor > postbody > blockNodeExporter.es6 */
	/**
	 * @param {Node} node - DOM node to export to Header
	 * @param {Number} level - level of header (2-5)
	 * @param {Container[]} containers - list of container nodes to apply
	 */
	var exportHeader = function(node, level, containers) {
		level = level || Number.parseInt(node.nodeName.charAt(1));
		containers = containers || [];

		var alignmentMatch = node.className.match(/align--(\w+)/) || [],
			align = getAlign(alignmentMatch[1]);

		return {
			level: level,
			alignment: align,
			containers: containers,
			value: traverseNode(node),
			type: 'Header'
		};


		function getAlign(align) {
			switch (align) {
				case 'center':
					return 'Center';
				case 'right':
					return 'Right';
				default:
					return 'Left';
			}
		}
	};

	var exportPullQuote = function(node) {
		return {
			alignment: getNodeAlignment(node),
			type: 'PullQuote',
			value: traverseNode(node)
		}
	};

	var exportList = function(node, containers) {
		containers = containers || [];

		var results = [],
			listItems = node.childNodes;

		for (var i = 0; i < listItems.length; i++) {
			var listItem = exportParagraph(listItems[i], containers);
			if (listItem) {
				results.push(listItem);
			}
		}

		return results;
	};

	var exportNode = function(node, containers) {
		containers = containers || [];

		var nodeName = node.nodeName.toLowerCase();

		switch (nodeName) {
			case 'ol':
			case 'ul':
				var style = (nodeName === 'ol') ? 'Number' : 'Bullet';
				containers.push({ type: 'List', style: style });
				return exportList(node, containers);
			case 'p':
			case 'li':
				return exportParagraph(node, containers);
			case 'h1':
			case 'h2':
			case 'h3':
			case 'h4':
			case 'h5':
			case 'h6':
				var level = Number.parseInt(nodeName.charAt(1)),
					minimumLevel = 2,
					maximumLevel = 4,
					adjustedLevel = Math.max(Math.min(level, maximumLevel), minimumLevel);
					
				return exportHeader(node, adjustedLevel, containers);
			case 'blockquote':
				containers.push({ type: 'BlockQuote' });
				return exportParagraph(node, containers);
			case 'figure':
				return renderPostBodyPartImage(node);
			case 'aside': 
				if (node.className.indexOf('pullquote') > -1) {
					return exportPullQuote(node);
				}
		}
	};

	var exportPost = function($textEditor) {
		$textEditor = $textEditor || $('.scribe');

		var $nodes = $textEditor.children(),
			postBody = [];

		$.each($nodes, function() {
			var exportableBodyPart = exportNode(this);
			
			if (exportableBodyPart) {	
				if (Array.isArray(exportableBodyPart)) {
					postBody.push(...exportableBodyPart);
				} else {
					postBody.push(exportableBodyPart);
				}
			}
		});

		return postBody;
	};

	return {
		renderPostBodyPartImage: renderPostBodyPartImage,
		traverseNode: traverseNode,
		exportParagraph: exportParagraph,
		exportHeader: exportHeader,
		exportList: exportList,
		exportNode: exportNode,
		exportPost: exportPost,
		getNodeAlignment: getNodeAlignment
	};

})();