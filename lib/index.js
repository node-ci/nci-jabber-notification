'use strict';

var	inherits = require('util').inherits,
	xmpp = require('node-xmpp-client');


exports.register = function(app) {
	var BaseNotifier = app.lib.notifier.BaseNotifier,
		logger = app.lib.logger('jabber notifier');

	function Notifier() {
		BaseNotifier.call(this);
	}

	inherits(Notifier, BaseNotifier);

	Notifier.prototype.init = function(params, callback) {
		var self = this;
		logger.log('connecting to the server ...');
		this.client = new xmpp.Client(params);

		this.client.on('online', function() {
			logger.log('connected');

			self.client.send(
				new xmpp.ltx.Element('presence', { })
				.c('show').t('chat').up()
				.c('status').t('Let\'s build something')
			);
		});

		this.client.on('error', function(err) {
			logger.error('error occurred:', err.stack || err);
		});

		this.client.on('reconnect', function() {
			logger.log('client reconnects …');
		});

		this.client.on('disconnect', function(err) {
			logger.log('disconnected', err);
		});

		this.client.on('stanza', function(stanza) {
			logger.log('incoming stanza:', String(stanza));
		});

		callback();
	};

	Notifier.prototype._sendMessage = function(to, body) {
		var envelope = new xmpp.ltx.Element('message', {
			to: to,
			type: 'chat'
		})
		.c('html', {xmlns: 'http://jabber.org/protocol/xhtml-im'})
		.c('body', {xmlns: 'http://www.w3.org/1999/xhtml'});

		var message = envelope.cnode(body);

		logger.log('outgoing message: %s', String(message.root()));

		this.client.send(message);
	};

	Notifier.prototype.send = function(params, callback) {
		var self = this,
			build = params.build,
			changes = build.scm.changes,
			recipients = build.project.notify.to.jabber;

		if (!recipients && !recipients.length) {
			logger.log('no recipients, quit');
			return;
		}

		recipients.forEach(function(recipient) {
			logger.log('send message to %s', recipient);

			var body = new xmpp.ltx.Element('text')
				.t(build.project.name + ' build ')
				.c('a', {href: app.config.http.url + '/builds/' + build.id})
				.t('#' + build.number).up()
				.t(' status is ' + build.status);

			if (changes.length) {
				body.t(', scm changes:').c('br');

				changes.forEach(function(change, index) {
					body.t(change.author + ': ' + change.comment);

					if (changes[index + 1]) {
						body.c('br');
					}
				});
			} else {
				body.t(', no scm changes');
			}

			self._sendMessage(recipient, body);
		});

		callback();
	};

	app.lib.notifier.register('jabber', Notifier);
};
