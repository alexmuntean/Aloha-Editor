/*!
 * Aloha Editor
 * Author & Copyright (c) 2011-2013 Gentics Software GmbH
 * aloha-sales@gentics.com
 * Licensed under the terms of http://www.aloha-editor.com/license.html
 */
define([
	'aloha',
	'jquery',
	'PubSub',
	'aloha/plugin',
	'aloha/state-override',
	'aloha/selection',
	'util/dom',
	'ui/ui',
	'ui/scopes',
	'ui/button',
	'ui/toggleButton',
	'ui/port-helper-attribute-field',
	'i18n!upnxt-field/nls/i18n',
	'i18n!aloha/nls/i18n'
], function WaiLangPlugin(
	Aloha,
	$,
	PubSub,
	Plugin,
	StateOverride,
	Selection,
	Dom,
	Ui,
	Scopes,
	Button,
	ToggleButton,
	attributeField,
	i18n
) {
	'use strict';

	var UPNXT_FIELD_CLASS = 'upnxt-field';
	var UPNXT_HIGHLIGHTS_CLASS = "aloha-upnxt-highlight";
	
	/**
	 * Ui Attribute Field singleton.
	 *
	 * Needs to be defined in prepareUi(), because of a problem with the
	 * stateful initialization of jQuery UI autocomplete implementation for
	 * Aloha Editor.
	 *
	 * @type {AttributeField}
	 */
	
	/**
	 * Sets focus on the given field.
	 *
	 * @param {AttributeField} field
	 */
	function focusOn(field) {
		if (field) {
			field.foreground();
			field.focus();
		}
	}

	/**
	 * Maps the given value to boolean.
	 *
	 * We need to do this to support Gentics Content.Node which provides Aloha
	 * Editor configuration from serialized PHP.
	 *
	 * @return {boolean}
	 */
	function isTrue(value) {
		return (
			true === value
			|| 1 === value
			|| 'true' === value
			|| '1' === value
		);
	}

	/**
	 * Checks whether this element is a upnxt-field wrapper element.
	 *
	 * @this {HTMLElement}
	 * @return {boolean} True if the given markup denotes upnxt-field wrapper.
	 */
	function filterForUpnxtFieldMarkup() {
		var $elem = $(this);
		return $elem.hasClass(UPNXT_FIELD_CLASS);
	}

	/**
	 * Looks for a wai-Lang wrapper DOM element within the the given range.
	 *
	 * @param {RangeObject} range
	 * @return {HTMLElement|null} Wai-lang wrapper node; null otherwise.
	 */
	function findUpnxtFieldMarkup(range) {
		return (
			Aloha.activeEditable
				? range.findMarkup(filterForUpnxtFieldMarkup, Aloha.activeEditable.obj)
				: null
		);
	}

	/**
	 * Wraps the contents at the current range in a upnxt-field wrapper element.
	 *
	 * @param {RangeObject} range
	 */
	function addMarkup(range) {
		if (range.isCollapsed()) {
			Dom.extendToWord(range);
		}
		Dom.addMarkup(
			range,
			$('<span class="' + UPNXT_FIELD_CLASS + '"></span>'),
			false
		);
		range.select();
	}

	/**
	 * Removes upnxt-field wrapper on the markup at the given range.
	 *
	 * @param {RangeObject} range
	 */
	function removeMarkup(range) {
		var markup = findUpnxtFieldMarkup(range);
		if (markup) {
			Dom.removeFromDOM(markup, range, true);
			range.select();
		}
	}

	/**
	 * Prepares the markup at the current range for language annotation.
	 */
	function prepareAnnotation() {
		var range = Selection.getRangeObject();

		// Because we don't want to add markup to an area that already contains
		// upnxt-field markup.
		if (!findUpnxtFieldMarkup(range)) {
			addMarkup(range);
		}
	}

	/**
	 * Toggles language annotation on the markup at the current range.
	 */
	function toggleAnnotation() {
		var upnxtFieldPlugin = this;

		if (Aloha.activeEditable) {
			var range = Selection.getRangeObject();
			if (findUpnxtFieldMarkup(range)) {
				removeMarkup(range);
			} else {
				if (range.isCollapsed()) {
					GENTICS.Utils.Dom.extendToWord(range);
					if (range.isCollapsed()) {
						if (StateOverride.enabled()) {
							StateOverride.setWithRangeObject(
								null,
								range,
								function (command, range) {
									addMarkup(range);
								}
							);
							return;
						}
					}
				}
				addMarkup(range);
			}
		}
	}

	function highlightFields(state) {
		if(isTrue(state)) {
			$("."+UPNXT_FIELD_CLASS).each(function() {
				$(this).addClass(UPNXT_HIGHLIGHTS_CLASS);
			});
		} else {
			$("."+UPNXT_FIELD_CLASS).each(function() {
				$(this).removeClass(UPNXT_HIGHLIGHTS_CLASS);
			});
		}
	}

	/**
	 * Mark the given element as a upnxt-field wrapper, with a class and
	 * annotation.
	 *
	 * @param {HTMLElement} element
	 */
	function annotate(element) {
		var $element = $(element);
		$element.addClass(UPNXT_FIELD_CLASS);
	}

	/**
	 * Initialize the buttons:
	 * Places the Wai-Lang UI buttons into the floating menu.
	 *
	 * Initializes `FIELD`.
	 *
	 * @param {Plugin} plugin Wai-lang plugin instance
	 */
	function prepareUi(plugin) {
		plugin._fieldButton = Ui.adopt('upnxtField', ToggleButton, {
			tooltip: i18n.t('button.add-upnxt-field.tooltip'),
			icon: 'aloha-icon aloha-upnxt-field-img',
			scope: 'Aloha.continuoustext',
			click: toggleAnnotation
		});

		plugin._highlightButton = Ui.adopt('upnxtHighlightFields', ToggleButton, {
			tooltip: i18n.t('button.add-upnxt-field.tooltip'),
			icon: 'aloha-icon aloha-upnxt-highlight-field-img',
			scope: 'Aloha.continuoustext',
			click: function() {
				highlightFields(plugin._highlightButton.getState());
			}
		});
	}

	/**
	 * Create a unique id prefixed with the specified prefix.
	 *
	 * @param {string} prefix
	 * @return {string} Unique identifier string
	 */
	var uniqueId = (function (prefix) {
		var idCounter = 0;
		return function uniqueId() {
			return prefix + '-' + (++idCounter);
		};
	}());

	/**
	 * Return the unique id of the given upnxt-field plugin instance.
	 * For use with the caching editable configurations.
	 *
	 * @param {Plugin} plugin Wai-lang plugin instance
	 * @return {string} Unique id of plugin instance
	 */
	function getPluginInstanceId(plugin) {
		return plugin._instanceId;
	}

	/**
	 * Cache of editable configuration for quicker lookup.
	 *
	 * Note that each configuration is the product of the per-editable
	 * configuration and the plugin configuration, and therefore the cache key
	 * for each configuration entry must be a function of both their
	 * identifiers.
	 *
	 * @type {string, object}
	 */
	var configurations = {};

	/**
	 * Get this plugin's configuration for the given editable.
	 *
	 * @param {Editable} editable
	 * @param {Plugin} plugin A upnxt-field plugin instance
	 * @return {object} configuration
	 */
	function getConfig(editable, plugin) {
		var key = editable.getId() + ':' + getPluginInstanceId(plugin);
		if (!configurations[key]) {
			configurations[key] = plugin.getEditableConfig(editable.obj);
		}
		return configurations[key];
	}

	/**
	 * Registers event handlers for the given plugin instance.
	 *
	 * @param {Plugin} plugin Instance of upnxt-field plugin.
	 */
	function subscribeEvents(plugin) {
		PubSub.sub('aloha.editable.activated', function onEditableActivated(msg) {
			var config = getConfig(msg.data.editable, plugin);
			if ($.inArray('span', config) > -1) {
				plugin._fieldButton.show();
			} else {
				plugin._fieldButton.hide();
			}
		});

		Aloha.bind('aloha-selection-changed', function onSelectionChanged($event, range) {
			var markup = findUpnxtFieldMarkup(range);
			
			if (markup) {
				plugin._fieldButton.setState(true);
			} else {
				plugin._fieldButton.setState(false);
			}

			highlightFields(plugin._highlightButton.getState());

			return false;
		});

		Aloha.bind('aloha-editable-created', function onEditableCreated($event, editable) {
			editable.obj.bind('keydown', plugin.hotKey.insertAnnotation,
				function () {
					prepareAnnotation();

					// Because on a MAC Safari, cursor would otherwise
					// automatically jump to location bar.  We therefore
					// prevent bubbling, so that the editor must hit ESC and
					// then META+I to manually do that.
					return false;
				});

			editable.obj.find('span.'+UPNXT_FIELD_CLASS).each(function () {
				annotate(this);
			});
		});
	}

	return Plugin.create('upnxt-field', {

		/**
		 * Default configuration, allows spans everywhere.
		 *
		 * @type {Array.<string>}
		 */
		config: ['span'],

		/**
		 * Define the exact standard of language codes to use (possible values
		 * are 'iso639-1' and 'iso639-2', default is 'iso639-1')
		 *
		 * @type {string}
		 */
		iso639: 'iso639-1',

		
		/**
		 * HotKeys used for special actions.
		 *
		 * @type {object<string, string>}
		 */
		hotKey: {
			insertAnnotation: i18n.t('insertAnnotation', 'ctrl+shift+l')
		},

		init: function init() {
			this._instanceId = uniqueId('upnxt-field');
			if (this.settings.hotKey) {
				$.extend(true, this.hotKey, this.settings.hotKey);
			}
			if (this.settings.iso639) {
				this.iso639 = this.settings.iso639;
			}
			prepareUi(this);
			subscribeEvents(this);
		},

		/**
		 * Makes the given editable DOM element clean for export.  Find all
		 * elements with lang attributes and remove the attribute.
		 *
		 * It also removes data attributes attached by the repository manager.
		 * It adds a xml:lang attribute with the value of the lang attribute.
		 *
		 * @param {jQuery<HTMLElement>} $element jQuery unit set containing
		 *                                       element to clean up.
		 */
		makeClean: function makeClean($element) {
			$element.find('span.'+UPNXT_FIELD_CLASS).each(function onEachLangSpan() {
				var $span = $(this);
				$span.removeClass(UPNXT_FIELD_CLASS);
			});
		}

	});
});
