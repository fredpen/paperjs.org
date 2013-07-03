// Install some useful jQuery extensions that we use a lot

$.extend($.fn, {
	orNull: function() {
		return this.length > 0 ? this : null;
	},

	findAndSelf: function(selector) {
		return this.find(selector).add(this.filter(selector));
	}
});

// Little Helpers

function hyphenate(str) {
	return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function isVisible(el) {
	if (el.is(':hidden'))
		return false;
	var viewTop = $(window).scrollTop();
	var viewBottom = viewTop + $(window).height();
	var top = el.offset().top;
	var bottom = top + el.height();
	return top >= viewTop && bottom <= viewBottom 
			|| top <= viewTop && bottom >= viewTop 
			|| top <= viewBottom && bottom >= viewBottom; 
}

function smoothScrollTo(el, callback) {
	$('html, body').animate({
		scrollTop: el.offset().top
	}, 250, callback);
}

var behaviors = {};

behaviors.sections = function() {
	var toc = $('.toc');
	var checks = [];
	var active;

	function update() {
		$.each(checks, function() {
			if (this())
				return false;
		});
	}

	$(document).scroll(update);
	$(window).resize(update);
	setTimeout(update, 0);

	$('.section').each(function() {
		var section = $(this);
		var anchor = $('a', section);
		// Move content until next section inside section
		section.append(section.nextUntil('.section'));
		var title = anchor.attr('title') || $('h1,h2', section).first().text();
		var id = section.attr('id');
		if (!id) {
			id = hyphenate(title)
				.replace(/\s+/g, '-')
				.replace(/^#/, '')
				.replace(/[!"#$%&'\()*+,.\/:;<=>?@\[\\\]\^_`{|}~]+/g, '-')
				.replace(/-+/g, '-');
			section.attr('id', id);
			anchor.attr('name', id);
		}

		function activate() {
			if (active)
				active.removeClass('active');
			selector.addClass('active');
			active = selector;
		}

		// Create table of contents on the fly
		if (toc) {
			var selector = $('<li class="entry selector"><a href="#' + id + '">'
					+ title + '</a></li>').appendTo(toc);
			if (section.is('.spacer'))
				selector.addClass('spacer');
			$('a', selector).click(function() {
				smoothScrollTo(section, function() {
					window.location.hash = id;
				});
				return false;
			});

			checks.push(function() {
				var visible = isVisible(section);
				if (visible)
					activate();
				return visible;
			});
		}
	});
};

behaviors.contentEnd = function() {
	// Expand height of .content-end so that the last anchor aligns
	// perfectly with the top of the browser window.
	var end = $('.content-end');
	var lastAnchor = $('a[name]:last');

	function resize() {
		var bottom = $(document).height() - lastAnchor.offset().top - $(window).height();
		end.height(end.height() - bottom);
	}

	if (end.length && lastAnchor.length) {
		$(window)
			.load(resize)
			.resize(resize);
		resize();
	}
};

behaviors.sticky = function() {
	$('.sticky').each(function() {
		me = $(this);
		container = $('<div/>').append(me.contents()).appendTo(me);
		// Insert a div wrapper of which the fixed class is modified depending on position
		$(window).scroll(function() {
			if (container.is(':visible'))
			  container.toggleClass('fixed', me.offset().top - $(this).scrollTop() <= 0);
		});
	});
};

behaviors.hash = function() {
	var hash = unescape(window.location.hash);
	if (hash) {
		// First see if there's a class member to open
		var target = $(hash);
		if (target.length) {
			if (target.hasClass('member'))
				toggleMember(target);
			smoothScrollTo(target);
		}
	}
};

behaviors.thumbnails = function() {
	var thumbnails = $('.thumbnail');
	var height = 0;
	thumbnails.each(function() {
		height = Math.max(height, $(this).height());
	});
	$('.thumbnail').height(height);
};

// TODO: Move this to offline reference
behaviors.expandableLists = function() {
	$('.expandable-list').each(function() {
		var list = $(this);
		$('<a href="#" class="arrow"/>')
			.prependTo(list)
			.click(function() {
				list.toggleClass('expanded');
			});
	});
};

behaviors.referenceClass = function() {
	var classes = $('.reference-classes');
	if (classes.length) {
		// Mark currently selected class as active. Do it client-sided
		// since the menu is generated by jsdocs.
		var path = window.location.pathname.toLowerCase();
		$('a[href="' + path + '"]', classes).addClass('active');
	}
};

behaviors.hover = function() {
	$('.hover').hover(function() {
		$('.normal', this).toggleClass('hidden');
		$('.over', this).toggleClass('hidden');
	});
};

behaviors.analytics = function() {
	// http://www.blastam.com/blog/index.php/2011/04/how-to-track-downloads-in-google-analytics/
	var baseHref = $('base').attr('href') || '';
	$('a').each(function() {
		var link = $(this);
		var href = link.attr('href');
		if (!href)
			return;
		if (/^https?\:/i.test(href) && !href.match(document.domain)) {
			link.click(function() {
				_gaq.push(['_trackEvent', 'External', 'Click',
						href.replace(/^https?\:\/\//i, '')]);
				if (/^_blank$/i.test(link.attr('target'))) {
					window.open(href);
					return false;
				}
			});
		} else if (/^mailto\:/i.test(href)) {
			link.click(function() {
				_gaq.push(['_trackEvent', 'Email', 'Click',
						href.replace(/^mailto\:/i, '')]);
			});
		} else if (/\.(zip|exe|pdf|doc*|xls*|ppt*|mp3)$/i.test(href)) {
			link.click(function() {
				var extension = /[^.]+$/.exec(href)[0];
				_gaq.push(['_trackEvent', 'Download',
						'Click - ' + extension.toUpperCase() + ' File',
						href]);
				if (/^_blank$/i.test(link.attr('target'))) {
					window.open(baseHref + href);
					return false;
				}
			});
		}
	});
};

behaviors.code = function() {
	$('.code:visible').each(function() {
		createCode($(this));
	});
};

behaviors.paperscript = function() {
	$('.paperscript:visible').each(function() {
		createPaperScript($(this));
	});
};

function createCodeMirror(place, options, source) {
	return new CodeMirror(place, $.extend({}, {
		mode: 'javascript',
		lineNumbers: true,
		matchBrackets: true,
		tabSize: 4,
		indentUnit: 4,
		indentWithTabs: true,
		tabMode: 'shift',
		value: source.text().match(
			// Remove first & last empty line
			/^\s*?[\n\r]?([\u0000-\uffff]*?)[\n\r]?\s*?$/)[1]
	}, options));
}

function createCode(element) {
	if (element.data('initialized'))
		return;
	var start = element.attr('start');
	var highlight = element.attr('highlight');
	var editor = createCodeMirror(function(el) {
		element.replaceWith(el);
	}, {
		lineNumbers: !element.parent('.resource-text').length,
		firstLineNumber: parseInt(start || 1, 10),
		mode: element.attr('mode') || 'javascript',
		readOnly: true
	}, element);
	if (highlight) {
		var highlights = highlight.split(',');
		for (var i = 0, l = highlights.length; i < l; i++) {
			var highlight = highlights[i].split('-');
			var hlStart = parseInt(highlight[0], 10) - 1;
			var hlEnd = highlight.length == 2
					? parseInt(highlight[1], 10) - 1 : hlStart;
			if (start) {
				hlStart -= start - 1;
				hlEnd -= start - 1;
			}
			for (var j = hlStart; j <= hlEnd; j++) {
				editor.setLineClass(j, 'highlight');
			}
		}
	}
	element.data('initialized', true);
}

function createPaperScript(element) {
	if (element.data('initialized'))
		return;

	var script = $('script', element).orNull(),
		runButton = $('.button.run', element).orNull();
	if (!script || !runButton)
		return;

	var canvas = $('canvas', element),
		hasResize = canvas.attr('resize'),
		showSplit = element.hasClass('split'),
		sourceFirst = element.hasClass('source'),
		width, height,
		editor = null,
		hasBorders = true,
		edited = false,
		animateExplain,
		explain = $('.explain', element).orNull(),
		source = $('<div class="source hidden"/>').insertBefore(script);

	if (explain) {
		explain.addClass('hidden');
		// Add explanation bubbles to tickle the visitor's fancy
		var explanations = [{
			index: 0,
			list: [
				[4, ''],
				[4, '<b>Note:</b> You can view and even edit<br>the source right here in the browser'],
				[1, ''],
				[3, 'To do so, simply press the <b>Source</b> button &rarr;']
			]
		}, {
			index: 0,
			indexIfEdited: 3, // Skip first sentence if user has already edited code
			list: [
				[4, ''],
				[3, 'Why don\'t you try editing the code?'],
				[1, ''],
				[4, 'To run it again, simply press press <b>Run</b> &rarr;']
			]
		}];
		var timer,
			mode;
		animateExplain = function(clearPrevious) {
			if (timer)
				timer = clearTimeout(timer);
			// Set previous mode's index to the end?
			if (mode && clearPrevious)
				mode.index = mode.list.length;
			mode = explanations[source.hasClass('hidden') ? 0 : 1];
			if (edited && mode.index < mode.indexIfEdited)
				mode.index = mode.indexIfEdited;
			var entry = mode.list[mode.index];
			if (entry) {
				explain.removeClass('hidden');
				explain.html(entry[1]);
				timer = setTimeout(function() {
					// Only increase once we're stepping, not in animate()
					// itself, as entering & leaving would continuosly step
					mode.index++;
					animateExplain();
				}, entry[0] * 1000);
			}
			if (!entry || !entry[1])
				explain.addClass('hidden');
		};
		element
			.mouseover(function() {
				if (!timer)
					animateExplain();
			})
			.mouseout(function() {
				// Check the effect of :hover on button to see if we need
				// to turn off...
				// TODO: make mouseenter / mouseleave events work again
				if (timer && runButton.css('display') == 'none') {
					timer = clearTimeout(timer);
					explain.addClass('hidden');
				}
			});
	}

	function showSource(show) {
		source.toggleClass('hidden', !show);
		runButton.text(show ? 'Run' : 'Source');
		if (explain)
			animateExplain(true);
		if (show && !editor) {
			editor = createCodeMirror(source[0], {
				onKeyEvent: function(editor, event) {
					edited = true;
				}
			}, script);
		}
	}

	function runScript() {
		var scope = paper.PaperScope.get(script[0]);
		if (scope) {
			// Update script to edited version
			var code = editor.getValue();
			script.text(code);
			// Keep a reference to the used canvas, since we're going to
			// fully clear the scope and initialize again with this canvas.
			// Support both old and new versions of paper.js for now:
			var element = scope.view.element || scope.view.canvas;
			// Clear scope first, then evaluate a new script.
			scope.clear();
			scope.initialize(script[0]);
			scope.setup(element);
			scope.evaluate(code);
		}
	}

	function resize() {
		if (!canvas.hasClass('hidden')) {
			width = canvas.width();
			height = canvas.height();
		} else if (hasResize) {
			// Can't get correct dimensions from hidden canvas,
			// so calculate again.
			var offset = source.offset();
			width = $(document).width() - offset.left;
			height = $(document).height() - offset.top;
		}
		// Resize the main element as well, so that the float:right button
		// is always positioned correctly.
		element
			.width(width)
			.height(height);
		source
			.width(width - (hasBorders ? 2 : 1))
			.height(height - (hasBorders ? 2 : 0));
	}

	function toggleView() {
		var show = source.hasClass('hidden');
		resize();
		canvas.toggleClass('hidden', show);
		showSource(show);
		if (!show)
			runScript();
		// Add extra margin if there is scrolling
		runButton.css('margin-right',
			$('.CodeMirror .CodeMirror-scroll', source).height() > height ? 23 : 8);
	}

	if (hasResize) {
		// Install the resize event only after paper.js installs its own,
		// which happens on the load event. This is needed because we rely
		// on paper.js performing the actual resize magic.
		$(window).load(function() {
			$(window).resize(resize);
		});
		hasBorders = false;
		source.css('border-width', '0 0 0 1px');
	}

	if (showSplit) {
		showSource(true);
	} else if (sourceFirst) {
		toggleView();
	}

	runButton
		.click(function() {
			if (showSplit) {
				runScript();
			} else {
				toggleView();
			}
			return false;
		})
		.mousedown(function() {
			return false;
		});

	element.data('initialized', true);
}

// Referene (before behaviors)

var lastMember = null;
function toggleMember(member, dontScroll) {
	var link = $('.member-link:first', member);
	if (!link.length)
		return true;
	var desc = $('.member-description', member);
	var visible = !link.hasClass('hidden');
	// Retrieve y-offset before any changes, so we can correct scrolling after
	var offset = (visible ? link : desc).offset().top;
	if (lastMember && !lastMember.is(member)) {
		var prev = lastMember;
		lastMember = null;
		toggleMember(prev, true);
	}
	lastMember = visible && member;
	link.toggleClass('hidden', visible);
	desc.toggleClass('hidden', !visible);
	if (!dontScroll) {
		// Correct scrolling relatively to where we are, by checking the amount
		// the element has shifted due to the above toggleMember call, and
		// correcting by 11px offset, caused by 1px border and 10px padding.
		var scroll = $(document).scrollTop();
		// Only change hash if we're not in frames, since there are redrawing
		// issues with that on Chrome.
		if (parent === self)
			window.location.hash = visible ? member.attr('id') : '';
		$(document).scrollTop(scroll
				+ (visible ? desc : link).offset().top - offset
				+ 11 * (visible ? 1 : -1));
	}
	if (!member.data('initialized') && visible) {
		behaviors.code();
		behaviors.paperscript();
		member.data('initialized', true);
	}
	return false;
}

$(function() {
	$('.reference .member').each(function() {
		var member = $(this);
		var link = $('.member-link', member);
		// Add header to description, with link and closing button
		var header = $('<div class="member-header"/>').prependTo($('.member-description', member));
		// Clone link, but remove name, id and change href
		link.clone().removeAttr('name').removeAttr('id').attr('href', '#').appendTo(header);
		// Add closing button.
		header.append('<div class="member-close"><input type="button" value="Close"></div>');
	});

	$('.reference .member-link, .reference .member-close').click(function() {
		return toggleMember($(this).parents('.member'));
	});
});

// DOM-Ready

$(function() {
	for (var i in behaviors)
		behaviors[i]();
});
