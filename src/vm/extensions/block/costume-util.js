/**
 * This module provides a set of utility functions for working with costumes.
 * @module costume-util
 */

/**
 * Convert full-width characters to half-width characters.
 * @param {string} str - string to convert
 * @returns {string} - converted string
 */
const convertToHalfWidthInt = function (str) {
    return str.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/[-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━]/g, '-');
};

/**
 * Convert array index from one-base to zero-base.
 * If index is negative, it is converted from the end of the array.
 * Returns most close index if index is out of range.
 * @param {number} index - one-base array index
 * @param {number} length - array length
 * @returns {number | undefined} - converted array index
 */
const convertToZeroBaseIndex = function (index, length) {
    if (length === 0) {
        return;
    }
    if (index > length) {
        return length - 1;
    }
    if (index < 0) {
        index = length + index;
        if (index < 0) {
            return 0;
        }
    } else {
        index--;
    }
    return index;
};

/**
 * Convert costume to dataURL.
 * @param {!object} costume - costume
 * @param {string?} format - format of the dataURL default is 'png'
 * @returns {Promise<string>} - a Promise that resolves when the image is converted
 */
export const costumeToDataURL = function (costume, format = 'png') {
    if (costume.asset.dataFormat === format) {
        return Promise.resolve(costume.asset.encodeDataURI());
    }
    const blob = new Blob([costume.asset.data], {type: costume.asset.assetType.contentType});
    const imageElement = new Image();
    imageElement.src = URL.createObjectURL(blob);
    return new Promise(resolve => {
        imageElement.onload = e => {
            URL.revokeObjectURL(imageElement.src);
            const img = e.target;
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = canvas.toDataURL(`image/${format}`);
            resolve(imageData);
        };
    });
};

/**
 * Get costume index by name or number.
 * If costumeName was not found and it is a number, it is treated as a one-base index.
 * Then that index was a negative number, it is treated as an index from the end of the costume list.
 * @param {Target!} target - target to get costume
 * @param {string} costumeName - name or number of the costume
 * @returns {number?} - costume index
 */
export const getCostumeIndexByNameOrNumber = function (target, costumeName) {
    const costumeArray = target.getCostumes();
    let costumeIndex = costumeArray.findIndex(c => c.name === costumeName);
    if (costumeIndex === -1) {
        const costumeNumber = parseInt(convertToHalfWidthInt(costumeName), 10);
        if (isNaN(costumeNumber) || costumeNumber === 0) {
            return null;
        }
        costumeIndex = convertToZeroBaseIndex(costumeNumber, costumeArray.length);
    }
    return costumeIndex;
};


/**
 * Get costume by name or number.
 * If costumeName was not found and it is a number, it is treated as a one-base index.
 * Then that index was a negative number, it is treated as an index from the end of the costume list.
 * @param {Target!} target - target to get costume
 * @param {string} costumeName - name or number of the costume
 * @returns {Costume?} - costume
 */
export const getCostumeByNameOrNumber = function (target, costumeName) {
    const costumeIndex = getCostumeIndexByNameOrNumber(target, costumeName);
    if (costumeIndex === null) {
        return;
    }
    return target.getCostumes()[costumeIndex];
};


// Convert base64 to raw binary data held in a dataURL.
// @see https://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
/**
 * Convert dataURL to binary data.
 * @param {string} dataURL - data to convert
 * @returns {Uint8Array} - binary data
 */
const dataURLToBinary = function (dataURL) {
    let byteString;
    if (dataURL.split(',')[0].indexOf('base64') >= 0) {
        byteString = atob(dataURL.split(',')[1]);
    } else {
        byteString = decodeURI(dataURL.split(',')[1]);
    }
    const data = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
        data[i] = byteString.charCodeAt(i);
    }
    return data;
};

/**
 * Load vector image and create skin for costume.
 * @param {Costume} costume - costume to load
 * @param {Runtime} runtime - runtime
 * @returns {Promise<Costume>} - a Promise that resolves when the image is loaded then returns the costume
 */
const loadVector = function (costume, runtime) {
    return new Promise(resolve => {
        const svgString = costume.asset.decodeText();
        costume.skinId = runtime.renderer.createSVGSkin(svgString);
        costume.size = runtime.renderer.getSkinSize(costume.skinId);
        const rotationCenter = runtime.renderer.getSkinRotationCenter(costume.skinId);
        costume.rotationCenterX = rotationCenter[0];
        costume.rotationCenterY = rotationCenter[1];
        costume.bitmapResolution = 1;
        resolve(costume);
    });
};

/**
 * Load bitmap image and create skin for costume.
 * @param {Costume} costume - costume to load
 * @param {Runtime} runtime - runtime
 * @returns {Promise<Costume>} - a Promise that resolves when the image is loaded then returns the costume
 */
const loadBitmap = function (costume, runtime) {
    const asset = costume.asset;
    return createImageBitmap(new Blob([asset.data], {type: asset.assetType.contentType}))
        .then(imageElem => {
            const bitmapResolution = 2;
            const canvas = document.createElement('canvas');
            canvas.width = imageElem.width;
            canvas.height = imageElem.height;
            const context = canvas.getContext('2d');
            context.drawImage(imageElem, 0, 0);
            // create bitmap skin
            costume.bitmapResolution = bitmapResolution;
            costume.skinId = runtime.renderer.createBitmapSkin(canvas, costume.bitmapResolution);
            const renderSize = runtime.renderer.getSkinSize(costume.skinId);
            costume.size = [
                renderSize[0] * costume.bitmapResolution,
                renderSize[1] * costume.bitmapResolution
            ];
            const rotationCenter = runtime.renderer.getSkinRotationCenter(costume.skinId);
            costume.rotationCenterX = rotationCenter[0] * costume.bitmapResolution;
            costume.rotationCenterY = rotationCenter[1] * costume.bitmapResolution;
            return costume;
        });
};

/**
 * Resize bitmap image.
 * @param {string} dataURL - image data
 * @param {number} width - max width of the resized image
 * @param {number} height - max height of the resized image
 * @returns {Promise<string>} - a Promise that resolves when the image is resized then returns the dataURL
 * @see https://stackoverflow.com/questions/23945494/use-html5-to-resize-an-image-before-upload
 */
const resizeBitmap = function (dataURL, width, height) {
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            let scale = 1;
            if (image.width > image.height) {
                if (image.width > width) {
                    scale = width / image.width;
                }
            } else if (image.height > height) {
                scale = height / image.height;
            }
            canvas.width = image.width * scale;
            canvas.height = image.height * scale;
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL(mimeString));
            image.onload = null;
            image.onerror = null;
        };
        image.onerror = function () {
            reject(new Error('dataURL load failed.'));
            image.onload = null;
            image.onerror = null;
        };
        image.src = dataURL;
    });
};

/**
 * Add image as a costume.
 * This will not update the target's current costume.
 * @param {Target} target - target to add costume
 * @param {string} dataURL - image data
 * @param {Runtime} runtime - runtime
 * @param {string} imageName - name of the costume
 * @param {VirtualMachine} vm - scratch vm
 * @returns {Promise<Costume>} - a Promise that resolves when the image is added then returns the costume
*/
export const addImageAsCostume = async function (target, dataURL, runtime, imageName = 'costume', vm) {
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    let assetType;
    let dataFormat;
    if (mimeString === 'image/svg+xml') {
        assetType = runtime.storage.AssetType.ImageVector;
        dataFormat = runtime.storage.DataFormat.SVG;
    } else if (mimeString === 'image/jpeg') {
        assetType = runtime.storage.AssetType.ImageBitmap;
        dataFormat = runtime.storage.DataFormat.JPG;
    } else if (mimeString === 'image/png') {
        assetType = runtime.storage.AssetType.ImageBitmap;
        dataFormat = runtime.storage.DataFormat.PNG;
    } else {
        return Promise.reject(new Error(`Unsupported image type: ${mimeString}`));
    }
    const bitmapResolution = 2;
    if (assetType === runtime.storage.AssetType.ImageBitmap) {
        const [stageWidth, stageHeight] = runtime.renderer.getNativeSize();
        dataURL = await resizeBitmap(dataURL, stageWidth * bitmapResolution, stageHeight * bitmapResolution);
    }
    const asset = runtime.storage.createAsset(
        assetType,
        dataFormat,
        dataURLToBinary(dataURL),
        null,
        true // generate md5
    );
    const newCostume = {
        name: imageName,
        dataFormat: dataFormat,
        asset: asset,
        md5: `${asset.assetId}.${dataFormat}`,
        assetId: asset.assetId,
        bitmapResolution: bitmapResolution
    };
    const currentCostumeIndex = target.currentCostume;
    if (vm) {
        return vm.addCostume(newCostume.md5, newCostume, target.id)
            .then(() => {
                target.setCostume(currentCostumeIndex);
                vm.emitTargetsUpdate();
                return newCostume;
            });
    }
    // no vm, so add costume directly
    const loader = (assetType === runtime.storage.AssetType.ImageVector) ? loadVector : loadBitmap;
    return loader(newCostume, runtime)
        .then(costume => {
            target.addCostume(costume);
            target.setCostume(currentCostumeIndex);
            runtime.emitProjectChanged();
            return costume;
        });
};
