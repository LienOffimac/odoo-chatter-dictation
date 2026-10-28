{
    "name": "Chatter Voice to text",
    "summary": "Dictate notes and messages in the chatter with a microphone button",
    "description": """
Chatter Dictation
=================
Adds a microphone button to the chatter composer (Log note and Send message).
Click the button, speak, and your words appear as text in the input field.

Speech recognition is performed by the browser (Chrome, Edge, Safari).
The recognition language is Dutch (Belgium) by default and can be changed
with the DICTATION_LANG constant in static/src/composer_dictation.js.
    """,
    "version": "20.0.0.9.0",
    "category": "Productivity",
    "author": "Lien Haesen - Offimac",
    "website": "https://offimac.com/",
    "license": "LGPL-3",
    "images": ["static/description/image_screenshot.png"],
    "depends": ["mail"],
    "data": [],
    "assets": {
        "web.assets_backend": [
            "chatter_dictation/static/src/composer_dictation.js",
            "chatter_dictation/static/src/composer_dictation.xml",
            "chatter_dictation/static/src/composer_dictation.scss",
        ],
    },
    "installable": True,
    "application": False,
}
