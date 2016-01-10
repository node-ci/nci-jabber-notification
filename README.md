# nci jabber notification

Jabber notification plugin for [nci](https://github.com/node-ci/nci).

## Installation

```sh
npm install nci-jabber-notification
```

## Usage

To enable add this plugin to the `plugins` section at server config, set
parameters for jabber account at `notify.jabber` e.g. for google talk:

```json
{
    "plugins": [
        "nci-jabber-notification"
    ],
    "notify": {
        "jabber": {
            "host": "talk.google.com",
            "port": 5222,
            "reconnect": true,
            "jid": "bot.nci@gmail.com",
            "password": "yourpassword"
        }
    }
....
}
```

after that you can set jabber notification at project config e.g.

```json
    "notify": {
        "on": [
            "change"
        ],
        "to": {
            "jabber": [
                "oleg.korobenko@gmail.com"
            ]
        }
    },
```