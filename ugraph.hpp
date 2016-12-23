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

#include <cstdint>
#include <cstring>
#include <cmath>

class ugraph {

    // Disallow copy and move operators and constructors.
    ugraph(ugraph&& other) = delete;
    ugraph(const ugraph& other) = delete;
    ugraph& operator=(const ugraph& other) = delete;
    ugraph& operator=(ugraph&& other) = delete;

    enum ugraph_gtypes {
        UGRAPH_TYPE_LINEAR = 0,
        UGRAPH_TYPE_QUADRATIC = 1,
        UGRAPH_TYPE_CUBIC = 2,
        UGRAPH_TYPE_QUARTIC = 3,
        UGRAPH_TYPE_QUINTIC = 4,
        UGRAPH_TYPE_POLYNOMIAL_DEGREE_6 = 5,
        UGRAPH_TYPE_POLYNOMIAL_DEGREE_7 = 6,
        UGRAPH_TYPE_POLYNOMIAL_DEGREE_8 = 7,
        UGRAPH_TYPE_POLYNOMIAL_DEGREE_9 = 8,
        UGRAPH_TYPE_GRAPH_TYPE_MAX = 9
    };

    struct ugraph_segment {
        uint8_t type;
        float minX;
        float maxX;
        float c[10];
    };

    // List of segments.
    int m_nsegments = 0;
    ugraph_segment* m_segments = nullptr;

protected:

    inline uint32_t hexCharToVal(const char A)
    {
        return (A > '9') ? (A &~ 0x20) - 'A' + 10 : (A - '0');
    }
    inline uint32_t readGraphCodeHex(const char* code, int len, int i)
    {
        if (i + 1 >= len) return 0;
        return hexCharToVal(code[i]) * 16 + hexCharToVal(code[i + 1]);
    }
    inline uint32_t readGraphCodeInt(const char* code, int len, int i)
    {
        return ((readGraphCodeHex(code, len, i    ) & 0xFF) << 24) +
               ((readGraphCodeHex(code, len, i + 2) & 0xFF) << 16) +
               ((readGraphCodeHex(code, len, i + 4) & 0xFF) << 8 ) +
               ((readGraphCodeHex(code, len, i + 6) & 0xFF) << 0 );
    }
    inline float readGraphCodeFloat(const char* code, int len, int i)
    {
        uint32_t val = readGraphCodeInt(code, len, i);
        return (reinterpret_cast<const float*>(&val))[0];
    }


public:
    ugraph() {}
    explicit ugraph(const char* code)
    {
        this->set(code);
    }
    ~ugraph() {
        this->clear();
    }

    // Clear the graph and reset to its original state..
    inline void clear(void)
    {
        if (m_segments) {
            delete[] m_segments;
            m_segments = nullptr;
        }
        m_nsegments = 0;
    }

    // Set graph from ugraphcode.
    inline bool set(const char* code)
    {
        this->clear();

        // Basic sanity checks.
        int len = strlen(code);
        if (len < 6 || code[0] != 'd' || code[1] != '8') {
            return false;
        }
        if (code[len - 1] != 'd' || code[len - 2] != '8') {
            return false;
        }

        // Allocate new segment array.
        m_nsegments = readGraphCodeHex(code, len, 2);
        m_segments = new ugraph_segment[m_nsegments];
        memset(m_segments, 0, m_nsegments * sizeof(ugraph_segment));

        // Read in segment array.
        for (int i = 0, off = 4; i < m_nsegments; i++) {
            m_segments[i].type = (uint8_t) readGraphCodeHex(code, len, off); off += 2;
            m_segments[i].minX = readGraphCodeFloat(code, len, off); off += 8;
            m_segments[i].maxX = readGraphCodeFloat(code, len, off); off += 8;
            
            if (m_segments[i].type >= UGRAPH_TYPE_LINEAR && m_segments[i].type <= UGRAPH_TYPE_POLYNOMIAL_DEGREE_9) {
                int poly = (m_segments[i].type - UGRAPH_TYPE_LINEAR) + 1;
                for (int j = 0; j <= poly; j++) {
                    m_segments[i].c[j] = readGraphCodeFloat(code, len, off); off += 8;
                }
            } else {
                // Unknown graph type.
                this->clear();
                return false;
            }

            if (off >= len) {
                // Read off end of array.
                this->clear();
                return false;
            }
        }

        return true;
    }

    // Evaluate the graph at given point x.
    inline float eval(float x)
    {
        for (int seg = 0; seg < m_nsegments; seg++) {
            if (x < m_segments[seg].minX || x > m_segments[seg].maxX) continue;

            float a = m_segments[seg].c[0];
            float b = m_segments[seg].c[1];
            float c = m_segments[seg].c[2];
            float d = m_segments[seg].c[3];
            float e = m_segments[seg].c[4];
            float f = m_segments[seg].c[5];
            float g = m_segments[seg].c[6];
            float h = m_segments[seg].c[7];
            float i = m_segments[seg].c[8];
            float j = m_segments[seg].c[9];

            switch (m_segments[seg].type) {
                case UGRAPH_TYPE_LINEAR: return a + b*x;
                case UGRAPH_TYPE_QUADRATIC: return a + b*x + c*pow(x, 2);
                case UGRAPH_TYPE_CUBIC: return a + b*x + c*pow(x, 2) + d*pow(x, 3);
                case UGRAPH_TYPE_QUARTIC: return a + b*x + c*pow(x, 2) + d*pow(x, 3) + e*pow(x, 4);
                case UGRAPH_TYPE_QUINTIC: return a + b*x + c*pow(x, 2) + d*pow(x, 3) + e*pow(x, 4) + f*pow(x, 5);
                case UGRAPH_TYPE_POLYNOMIAL_DEGREE_6: return a + b*x + c*pow(x, 2) + d*pow(x, 3) + e*pow(x, 4) + f*pow(x, 5) + g*pow(x, 6);
                case UGRAPH_TYPE_POLYNOMIAL_DEGREE_7: return a + b*x + c*pow(x, 2) + d*pow(x, 3) + e*pow(x, 4) + f*pow(x, 5) + g*pow(x, 6) + h*pow(x, 7);
                case UGRAPH_TYPE_POLYNOMIAL_DEGREE_8: return a + b*x + c*pow(x, 2) + d*pow(x, 3) + e*pow(x, 4) + f*pow(x, 5) + g*pow(x, 6) + h*pow(x, 7) + i*pow(x, 8);
                case UGRAPH_TYPE_POLYNOMIAL_DEGREE_9: return a + b*x + c*pow(x, 2) + d*pow(x, 3) + e*pow(x, 4) + f*pow(x, 5) + g*pow(x, 6) + h*pow(x, 7) + i*pow(x, 8) + j*pow(x, 9);
                default:
                    return 0.0;
            }
        }
        return 0.0;
    }
};