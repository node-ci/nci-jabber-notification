'use strict';

var expect = require('expect.js'),
	sinon = require('sinon'),
	_ = require('underscore'),
	plugin = require('./lib');

describe('Jabber notifier', function() {

	var url = 'http://127.0.0.1:3000';

	var messageTemplate = _(
		'<message to="<%= to %>" type="chat">' +
		'<html xmlns="http://jabber.org/protocol/xhtml-im">' +
		'<body xmlns="http://www.w3.org/1999/xhtml">' +
		'<text>' +
			'<%= build.project.name %> build ' +
			'<a href="<%= url %>/builds/<%= build.id %>">#<%= build.number %></a> ' +
			'status is <%= build.status %>' +
			'<% if (build.scm.changes.length) { %>' +
				', scm changes:<br/>' +
				'<% _(build.scm.changes).map(function(change, index) { %>' +
					'<%= change.author %>: <%= change.comment %>' +
					'<% if (build.scm.changes[index + 1]) { %>' +
						'<br/>' +
					'<% } %>' +
				'<% }); %>' +
			'<% } else { %>' +
				', no scm changes' +
			'<% }%>' +
		'</text></body></html></message>'
	).template();

	var createMessage = function(params) {
		return messageTemplate(_({url: url}).extend(params));
	};

	var createSendParams = function(params) {
		return {
			build: _({
				id: 2,
				number: 122,
				status: 'error',
				scm: {changes: []},
				project: {
					name: 'nci',
					notify: {to: {jabber: ['oleg.korobenko@gmail.com']}}
				}
			}).extend(params.build)
		};
	};

	var notifier, sendSpy, sendMessageSpy;

	before(function() {
		var noop = function() {};
		plugin.register({
			lib: {
				logger: function() {
					return {log: noop, error: noop};
				},
				notifier: {
					BaseNotifier: function() {
					},
					register: function(type, constructor) {
						notifier = new constructor();
						notifier.client = {};
						notifier.client.send = sinon.spy();
						sendSpy = notifier.client.send;
						sendMessageSpy = sinon.spy(notifier, '_sendMessage');
					}
				}
			},
			config: {http: {url: url}}
		});
	});

	var describeMessageCreation = function(label, params) {
		describe(label, function(done) {
			var sendParams = createSendParams(params);

			before(function(done) {
				sendMessageSpy.reset();
				sendSpy.reset();
				notifier.send(sendParams, done);
			});

			it('call client.send after _sendMessage', function() {
				expect(sendSpy.calledAfter(sendMessageSpy)).equal(true);
			});

			var recipients = sendParams.build.project.notify.to.jabber;

			_(recipients).each(function(recipient, index) {
				var number = index + 1;

				it('pass recipient ' + number + ' to the _sendMessage', function() {
					expect(sendMessageSpy.firstCall.args[0]).equal(
						sendParams.build.project.notify.to.jabber[0]
					);
				});

				it(
					'pass xml message for recipient ' + number + ' to the _sendMessage',
					function() {
						var message = String(sendSpy.getCall(index).args[0].root());
						expect(message).eql(createMessage(
							_({to: recipient}).extend(sendParams)
						));
					}
				);

			});

			var callCount = recipients.length;
			it('call _sendMessage ' + callCount + ' times in total', function() {
				expect(sendMessageSpy.callCount).equal(callCount);
			});

			it('call _sendMessage ' + callCount + ' times in total', function() {
				expect(sendSpy.callCount).equal(callCount);
			});
		});
	};

	describeMessageCreation('when scm has changes and 1 recipient', {
		build: {
			scm: {
				changes: [{
					author: 'okv', comment: 'last'
				}, {
					author: 'okv', comment: 'last - 1'
				}]
			}
		}
	});

	describeMessageCreation('when no scm changes and 1 recipient', {build: {}});

	describeMessageCreation('when no scm changes and 2 recipients', {
		build: {
			project: {
				name: 'nci',
				notify: {to: {jabber: [
					'oleg.korobenko@gmail.com', 'oleg.poligon@gmail.com'
				]}}
			}
		}
	});
});
