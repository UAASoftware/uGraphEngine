# μGraphEngine

A simple minimalistic framework designed for games, designed to capture real world data
for fast evaluation. The data may be segmented into multiple graphs, each segment may
be curve fitted. The coefficients may be encoded in a shortened string, which the backend
may re-construct the graph data from.

The framework provides a frontend GUI editor written in electron / javascript, and a backend
evaluation library written in C++. Curve fitting uese the regression-js library.

## Development

To develop, simply clone the directory and run through npm

```
$ git clone https://github.com/UAASoftware/uGraphEngine.git
$ cd uGraphEngine
$ npm install
$ npm start
```

## Build Release Package

```
$ npm run build
```

Builds the app for macOS, Linux, and Windows, using [electron-packager](https://github.com/electron-userland/electron-packager).


## License

MIT © [<%= name %>](<%= website %>)

