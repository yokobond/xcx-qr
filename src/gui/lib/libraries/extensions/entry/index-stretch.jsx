/* eslint-disable import/no-unresolved */
import React from 'react';
import {FormattedMessage} from 'react-intl';

/**
 * This is an extension for Xcratch.
 */

import iconURL from './entry-icon.png';
import insetIconURL from './inset-icon.svg';

const translations =
{
    'en': {
        'xcxQR.entry.name': 'QR Code Extension Blocks',
        'xcxQR.entry.description': 'Generate and read QR code'
    },
    'ja': {
        'xcxQR.entry.name': 'QRコード拡張ブロック',
        'xcxQR.entry.description': 'QRコードを作ったり読んだりする'
    },
    'ja-Hira': {
        'xcxQR.entry.name': 'QRコードかくちょうブロック',
        'xcxQR.entry.description': 'QRコードをつくったりよんだりする'
    }
};

const entry = {
    name: (
        <FormattedMessage
            defaultMessage="QR Code"
            id="xcxQR.entry.name"
        />
    ),
    extensionId: 'xcxQR',
    extensionURL: null,
    collaborator: 'Yengawa Lab',
    iconURL: iconURL,
    insetIconURL: insetIconURL,
    description: (
        <FormattedMessage
            defaultMessage="QR Code Extension Blocks"
            id="xcxQR.entry.description"
        />
    ),
    featured: true,
    disabled: false,
    bluetoothRequired: false,
    internetConnectionRequired: false,
    helpLink: 'https://yokobond.github.io/xcx-costumex/',
    translationMap: translations
};

export default entry;
