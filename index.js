var BlueBird = require('bluebird');
var cloudinary = require('cloudinary');
var util = require('util');
var BaseAdapter = require('ghost-storage-base');
var path = require('path');
var request = require('request').defaults({ encoding: null });

class CloudinaryAdapter extends BaseAdapter{
  constructor(options) {
    super(options);
    this.config = options || {};
    cloudinary.config(options);
  }

  exists(filename) {
    return new BlueBird(function(resolve) {
      // Use explicit instead of resource because there's no rate limit for explicit
      cloudinary.v2.uploader.explicit(path.parse(filename).name, {type: 'upload'}, function(error, result) {
        if (result) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  save(image, targetDir) {
    var cloudinaryImageSettings;
    var cloudinaryFileSettings;
    if (this.config.configuration !== undefined) {
      cloudinaryImageSettings = this.config.configuration.image;
      cloudinaryFileSettings = this.config.configuration.file || {};
    } else {
      cloudinaryImageSettings = {};
      cloudinaryFileSettings = {};
    }
    //Using the real image name sanitizing it for the web
    cloudinaryFileSettings.public_id = path.parse(this.getSanitizedFileName(image.name)).name;

    return new BlueBird(function(resolve) {
      cloudinary.uploader.upload(image.path, function(result) {
        if (result.error) {
          return reject(new errors.GhostError({
              err: result.error,
              message: 'Could not upload the image: ' + image.path
          }));
        } else {
          resolve(cloudinary.url(result.public_id.concat(".", result.format), cloudinaryImageSettings));
        }
      }, cloudinaryFileSettings);
    });
  }

  serve() {
    return function customServe(req, res, next) {
      next();
    };
  }

  delete(filename) {
    return new BlueBird(function(resolve) {
      cloudinary.uploader.destroy(path.parse(filename).name, function(result) {
        resolve(result);
      });
    });
  }

  read(options) {
    options = options || {};
    return new BlueBird(function (resolve, reject) {
      request.get(options.path, function (err, res) {
        if (err) {
          reject(new Error("Cannot download image"));
        } else {
          resolve(res.body);
        }
      });
    });
  }
}

module.exports = CloudinaryAdapter;
