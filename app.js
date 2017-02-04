const fs = require("fs");
const path = require("path");
const fsExtra = require("fs-extra");
const Rx = require("rxjs");
const minimatch = require("minimatch");

//const path = "f:\\projects\\ObservableFS";

class FileSelect {
    constructor(glob) {
        this.glob = glob;
    }

    run(obs) {
        return obs.filter(file => minimatch(file, this.glob));
    }
}

class FileSelectMany {
    constructor(globs) {
        this.globs = globs;
    }

    run(obs) {
        return obs.filter(file => {
            for(let glob of this.globs) {
                if(minimatch(file, glob)) {
                    return true;
                }
            }

            return false;
        });
    }
}

class FileExclude {
    constructor(glob) {
        this.glob = glob;
    }

    run(obs) {
        return obs.filter(file => !minimatch(file, this.glob));
    }
}

class CopyTo {
    constructor(dest) {
        this.dest = dest;
    }

    run(obs) {
        return obs.flatMap(file => {
            return Rx.Observable.create(observer=> {
                fsExtra.copy(file, this.dest + "\\" + path.parse(file).base, function(err) {
                    if(err) {
                        observer.error(err);
                        return;
                    }

                    observer.next(file);

                    observer.complete();
                });
            });
        });
    }
}


class FileSet {
    constructor(path) {
        this.path = path;
        this.pipes = [];
    }

    select(glob) {
        this.pipes.push(new FileSelect(glob));

        return this;
    }

    selectMany(globs) {
        this.pipes.push(new FileSelectMany(globs));

        return this;
    }

    exclude(glob) {
        this.pipes.push(new FileExclude(glob));

        return this;
    }

    get() {
        let obs = this.scan();

        for(let pipe of this.pipes) {
            obs = pipe.run(obs);
        }

        return obs;
    }

    subscribe(...args) {
        const obs = this.get();
        return obs.subscribe.apply(obs, args);
    }

    copyTo(dest) {
        this.pipes.push(new CopyTo(dest));

        return this;
    }

    scan() {
        return Rx.Observable.create((observer) => {
            fs.readdir(this.path, function (err, files) {
                if (err) {
                    observer.error(err);
                    return;
                }

                for (let file of files) {
                    observer.next(file);
                }

                observer.complete();
            });
        });
    }
}

const fileSet = new FileSet("F:\\Projects\\ObservableFS");
fileSet.selectMany(["*.js", "*.json"])
    //.exclude("*.json")
    .copyTo("F:\\2")
    .subscribe(function(file) {
        console.log(file);
    }, function(err) {
        console.error(err);
    });

// scanDir().filter(file => minimatch(file, "*.js")).subscribe(function(file) {
//     console.log(file);
// }, function(err) {
//     console.error(err);
// }, function() {
//     console.log("completed");
// })
//
