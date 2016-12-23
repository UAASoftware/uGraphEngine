# μGraphEngine

A simple minimalistic framework designed for games, designed to capture real world data
for fast evaluation. The data may be segmented into multiple graphs, each segment may
be curve fitted. The coefficients may be encoded in a shortened string, which the backend
may re-construct the graph data from.

The framework provides a frontend GUI editor written in HTML / javascript, and a backend
evaluation library written in C++. Curve fitting uese the regression-js library.

## Instructions

Feel free to use the online version [here](https://uaasoftware.com/ugraph).
Otherwise, feel free to hose a copy yourself by cloning this repo onto any old web server.
To run locally, just open index.html with any non-ancient browser.

For the C++ backend, ugraph.hpp provides a header only library. Example usage:
```
{
    ugraph u("d8010200000000400000003f0000003f0000003f1999993f3333338d");
    assert(abs(u.eval(1.98f) - 9.275f) < 0.01f);
    assert(u.eval(4.313f) == 0.0f);
}
``


## License

MIT © [UAA Software](uaasoftware.com)

