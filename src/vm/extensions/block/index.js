import BlockType from '../../extension-support/block-type';
import ArgumentType from '../../extension-support/argument-type';
import Cast from '../../util/cast';
import log from '../../util/log';
import translations from './translations.json';
import blockIcon from './block-icon.png';
import {addImageAsCostume, getCostumeIndexByNameOrNumber} from './costume-util';

let
    QRCode;
(async () => {
    QRCode = (await import(
        /* webpackIgnore: true */
        'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/+esm'
    ));
})();

let QrScanner;
let qrEngine;
(async () => {
    QrScanner = (await import(
        /* webpackIgnore: true */
        'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/+esm'
    )).default;
    qrEngine = await QrScanner.createQrEngine(QrScanner.WORKER_PATH);
})();

/**
 * Formatter which is used for translation.
 * This will be replaced which is used in the runtime.
 * @param {object} messageData - format-message object
 * @returns {string} - message for the locale
 */
let formatMessage = messageData => messageData.default;

/**
 * Setup format-message for this extension.
 */
const setupTranslations = () => {
    const localeSetup = formatMessage.setup();
    if (localeSetup && localeSetup.translations[localeSetup.locale]) {
        Object.assign(
            localeSetup.translations[localeSetup.locale],
            translations[localeSetup.locale]
        );
    }
};

const EXTENSION_ID = 'xcxQR';

/**
 * URL to get this extension as a module.
 * When it was loaded as a module, 'extensionURL' will be replaced a URL which is retrieved from.
 * @type {string}
 */
let extensionURL = 'https://yokobond.github.io/xcx-qr/dist/xcxQR.mjs';

/**
 * Scratch 3.0 blocks for example of Xcratch.
 */
class ExtensionBlocks {
    /**
     * A translation object which is used in this class.
     * @param {FormatObject} formatter - translation object
     */
    static set formatMessage (formatter) {
        formatMessage = formatter;
        if (formatMessage) setupTranslations();
    }

    /**
     * @return {string} - the name of this extension.
     */
    static get EXTENSION_NAME () {
        return formatMessage({
            id: 'xcxQR.name',
            default: 'QR Code',
            description: 'name of the extension'
        });
    }

    /**
     * @return {string} - the ID of this extension.
     */
    static get EXTENSION_ID () {
        return EXTENSION_ID;
    }

    /**
     * URL to get this extension.
     * @type {string}
     */
    static get extensionURL () {
        return extensionURL;
    }

    /**
     * Set URL to get this extension.
     * The extensionURL will be changed to the URL of the loading server.
     * @param {string} url - URL
     */
    static set extensionURL (url) {
        extensionURL = url;
    }

    /**
     * Construct a set of blocks for QR Code.
     * @param {Runtime} runtime - the Scratch 3.0 runtime.
     */
    constructor (runtime) {
        /**
         * The Scratch 3.0 runtime.
         * @type {Runtime}
         */
        this.runtime = runtime;

        if (runtime.formatMessage) {
            // Replace 'formatMessage' to a formatter which is used in the runtime.
            formatMessage = runtime.formatMessage;
        }

        this.scanTimer = null;
        this.scanInterval = 100;

        this.scannedData = '';
        this.scannedCornerPoints = [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}];
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        setupTranslations();
        return {
            id: ExtensionBlocks.EXTENSION_ID,
            name: ExtensionBlocks.EXTENSION_NAME,
            extensionURL: ExtensionBlocks.extensionURL,
            blockIconURI: blockIcon,
            showStatusButton: false,
            blocks: [
                {
                    opcode: 'startQRScan',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'xcxQR.startQRScan',
                        default: 'start scan QR code'
                    }),
                    func: 'startQRScan',
                    arguments: {
                    }
                },
                {
                    opcode: 'stopQRScan',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'xcxQR.stopQRScan',
                        default: 'stop scan QR code'
                    }),
                    func: 'stopQRScan',
                    arguments: {
                    }
                },
                {
                    opcode: 'reportQRData',
                    blockType: BlockType.REPORTER,
                    disableMonitor: false,
                    text: formatMessage({
                        id: 'xcxQR.reportQRData',
                        default: 'QR code data'
                    }),
                    func: 'reportQRData',
                    arguments: {
                    }
                },
                {
                    opcode: 'reportQRCornerPoint',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    text: formatMessage({
                        id: 'xcxQR.reportQRCornerPoint',
                        default: 'QR code [CORNER] [POINT]'
                    }),
                    func: 'reportQRCornerPoint',
                    arguments: {
                        CORNER: {
                            type: ArgumentType.STRING,
                            menu: 'qrCornerMenu',
                            defaultValue: 'topLeft'
                        },
                        POINT: {
                            type: ArgumentType.STRING,
                            menu: 'qrPointMenu',
                            defaultValue: 'x'
                        }
                    }
                },
                {
                    opcode: 'whenQRIsRead',
                    blockType: BlockType.EVENT,
                    text: formatMessage({
                        id: 'xcxQR.whenQRIsRead',
                        default: 'when QR code is read'
                    }),
                    isEdgeActivated: false,
                    shouldRestartExistingThreads: true
                },
                '---',
                {
                    opcode: 'generateQRCode',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'xcxQR.generateQRCode',
                        default: '[TEXT] to QR code with color [COLOR] as [NAME]'
                    }),
                    disableMonitor: true,
                    func: 'generateQRCode',
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'xcxQR.generateQRCode.defaultText',
                                default: 'QR'
                            })
                        },
                        COLOR: {
                            type: ArgumentType.COLOR,
                            defaultValue: '#000000'
                        },
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'xcxQR.generateQRCode.defaultName',
                                default: 'costume'
                            })
                        }
                    }
                }
            ],
            menus: {
                qrCornerMenu: {
                    acceptReporters: false,
                    items: 'getCornerMenu'
                },
                qrPointMenu: {
                    acceptReporters: false,
                    items: 'getPointMenu'
                }
            }
        };
    }

    getCornerMenu () {
        return [
            {
                text: formatMessage({
                    id: 'xcxQR.topLeft',
                    default: 'top left'
                }),
                value: 'topLeft'
            },
            {
                text: formatMessage({
                    id: 'xcxQR.topRight',
                    default: 'top right'
                }),
                value: 'topRight'
            },
            {
                text: formatMessage({
                    id: 'xcxQR.bottomRight',
                    default: 'bottom right'
                }),
                value: 'bottomRight'
            },
            {
                text: formatMessage({
                    id: 'xcxQR.bottomLeft',
                    default: 'bottom left'
                }),
                value: 'bottomLeft'
            }
        ];
    }

    getPointMenu () {
        return ['x', 'y'];
    }

    /**
     * Generate QR code from text.
     * @param {string} text - the text to be encoded in the QR code.
     * @param {string} dark - the color of the dark part of the QR code.
     * @returns {Promise<string>} - resolves dataURL of the QR code
     */
    textToQRCode (text, dark = '#000000') {
        return QRCode.toDataURL(
            text,
            {
                color: {dark: dark, light: '#FFFFFF00'}
            });
    }

    /**
     * Generate QR code then add or replace it as a costume.
     * @param {object} args - the block's arguments.
     * @param {string} args.TEXT - the text to be encoded in the QR code.
     * @param {string} args.COLOR - the color of the dark part of the QR code.
     * @param {string} args.NAME - the name of the costume.
     * @param {object} util - utility object provided by the runtime.
     * @returns {Promise<string>} - resolves dataURL when the QR code is added
     */
    async generateQRCode (args, util) {
        const text = Cast.toString(args.TEXT);
        const dark = args.COLOR;
        const target = util.target;
        const dataURL = await this.textToQRCode(text, dark);
        const costumeName = Cast.toString(args.NAME);
        const runtime = this.runtime;
        if (target.sprite.costumes.length > 1) {
            const costumeIndex = getCostumeIndexByNameOrNumber(target, costumeName);
            if (costumeIndex !== null) {
                target.deleteCostume(costumeIndex);
            }
        }
        return addImageAsCostume(target, dataURL, runtime, costumeName, runtime.vm)
            .then(costume => ` ${costume.asset.encodeDataURI()} `)
            .catch(error => {
                log.error(error);
                return error.message;
            });
    }

    /**
     * Return snapshot image dataURL.
     * @returns {Promise<string>} - resolves snapshot dataURL
     */
    snapshotData () {
        return new Promise(resolve => {
            this.runtime.renderer.requestSnapshot(imageDataURL => {
                resolve(imageDataURL);
            });
        });
    }


    /**
     * Read QR code from an image.
     * @returns {Promise<object>} - resolves scan result or null for no QR code
     */
    async scanQR () {
        const runtime = this.runtime;
        let canvasWidth = 960;
        let canvasHeight = 720;
        const dataURL = await (new Promise(resolve => {
            runtime.renderer.requestSnapshot(imageDataURL => {
                canvasWidth = runtime.renderer.canvas.width;
                canvasHeight = runtime.renderer.canvas.height;
                resolve(imageDataURL);
            });
        }));
        try {
            const scanResult = await QrScanner.scanImage(
                dataURL,
                {
                    qrEngine: qrEngine,
                    returnDetailedScanResult: true
                });
            if (!scanResult || !scanResult.data) {
                return null;
            }
            this.scannedData = scanResult.data;
            this.scannedCornerPoints = scanResult.cornerPoints.map(point => ({
                x: (point.x * (480 / canvasWidth)) - 240,
                y: 180 - (point.y * (360 / canvasHeight))
            }));
            if (scanResult) {
                runtime.startHats('xcxQR_whenQRIsRead');
            }
            return scanResult;
        } catch (e) {
            return null;
        }
    }


    /**
     * Start QR scan.
     */
    startQRScan () {
        if (this.scanTimer) {
            return; // already started
        }
        this.scanTimer = setTimeout(() => {
            this.scanQR()
                .catch(() => {
                    // ignore no QR code
                })
                .finally(() => {
                    this.scanTimer = null;
                    this.startQRScan();
                });
        }, this.scanInterval);
    }

    stopQRScan () {
        if (this.scanTimer) {
            clearTimeout(this.scanTimer);
            this.scanTimer = null;
        }
    }

    reportQRData () {
        return this.scannedData;
    }

    reportQRCornerPoint (args) {
        const corner = args.CORNER;
        const point = args.POINT;
        const index = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].indexOf(corner);
        if (index < 0) {
            return 0;
        }
        return this.scannedCornerPoints[index][point];
    }
}

export {ExtensionBlocks as default, ExtensionBlocks as blockClass};
