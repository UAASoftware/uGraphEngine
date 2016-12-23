/*

The MIT License (MIT)

Copyright (c) UAA Software

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

#include <cstdio>
#include <cstdint>
#include <cassert>
#include "ugraph.hpp"

int main() {
    printf("uGraphEngine C++ tests.\n");
    
    // Empty graph should evaluate to zero.
    {
        ugraph u("d8008d");
        assert(u.eval(4) == 0.0f);
    }

    // Invalid graph should evaluate to zero.
    {
        ugraph u("abracadabra");
        assert(u.eval(0) == 0.0f);
        assert(u.eval(1) == 0.0f);
        assert(u.eval(2) == 0.0f);
        assert(u.eval(3) == 0.0f);
    }

    // Flat line y = 0.5 should evaluate to...well, 0.5!
    {
        ugraph u("d80100000000003f8000003f000000000000008d");
        assert(u.eval(0.313f) == 0.5f);
        assert(u.eval(4.313f) == 0.0f);
    }

    // 0.5x + 0.5 = 1.
    {
        ugraph u("d80100000000003f8000003f0000003f0000008d");
        assert(u.eval(1.0f) == 1.0f);
        assert(u.eval(4.313f) == 0.0f);
    }

    // Cubic polynomial.
    {
        ugraph u("d8010200000000400000003f0000003f0000003f1999993f3333338d");
        assert(abs(u.eval(1.98f) - 9.275f) < 0.01f);
        assert(u.eval(4.313f) == 0.0f);
    }

    // Segments test
    {
        ugraph u("d80300000000003f8000003f00000000000000003f800000400000003f8000000000000000400000004040000040000000000000008d");
        assert(u.eval(0.5) == 0.5f);
        assert(u.eval(1.5) == 1.0f);
        assert(u.eval(2.5) == 2.0f);
        assert(u.eval(3.5) == 0.0f);
    }

    printf("Tests OK!\n");
}
