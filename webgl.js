const glCanvas = document.getElementById('gl');
var vertices = [];
var gl =
    glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
    //If something goes wrong, check ERROR-LIKELY in ctrl+f

var mouseX = 0, mouseY = 0;
var angle = [0.0, 0.0, 0.0, 1.0];
var angleGL = 0;

var geometry =
{
    vertices: [],
    faces: []
};

document.getElementById('gl').addEventListener('mousemove', function(e)
{
    if(e.buttons == 1)
    {
        angle[0] -= (mouseY - e.y) * 0.01;
        angle[1] -= (mouseX - e.x) * 0.01;
        gl.uniform4fv(angleGL, new Float32Array(angle));
        Render();
    }
    mouseX = e.x;
    mouseY = e.y;
});

var textureGL = 0;
var display = [0.0, 0.0, 0.0, 0.0];
var displayGL = 0;

// #region Init

function InitWebGL()
{
    if(!gl)
        {
            alert('WebGL is not supported');
            return;
        }
        let canvas = document.getElementById('gl');
        if(canvas.width != canvas.clientWidth ||
            canvas.height != canvas.clientHeight)
    {
        canvas.width  = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    
    InitViewport(canvas);
}

function InitViewport()
{
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    gl.clearColor(0.0, 0.4, 0.6, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    
    
    InitShaders();
}

function InitHTMLShaders()
{
    //Vertex Shader Content:
    document.getElementById("vs").innerHTML = 
`precision mediump float;
attribute vec3 Pos;
attribute vec3 Color;
attribute vec2 UV;
attribute vec3 Normal;
uniform vec4 Angle;
varying vec3 vertexColor;
varying vec2 uv;
varying vec3 normal;

void main()
{
    float coX = cos(Angle.x);
    float siX = sin(Angle.x);
    mat4 matX = mat4(vec4(1.0,  0.0, 0.0, 0.0),
                        vec4(0.0,  coX, siX, 0.0),
                        vec4(0.0, -siX, coX, 0.0),
                        vec4(0.0,  0.0, 0.0, 1.0));
    float coY = cos(Angle.y);
    float siY = sin(Angle.y);
    mat4 matY = mat4(vec4(coY, 0.0, -siY, 0.0),
                        vec4(0.0, 1.0,  0.0, 0.0),
                        vec4(siY, 0.0,  coY, 0.0),
                        vec4(0.0, 0.0,  0.0, 1.0));

    gl_Position = matY * matX * vec4(Pos, 1.0);
    vertexColor = Color;
    uv = UV;
    mat3 normalMatrix = mat3(matY * matX);
    normal = normalize(normalMatrix * Normal);
}`;

    //Fragment Shader Content:
    document.getElementById("fs").innerHTML = 
`precision mediump float;
uniform sampler2D Texture;
uniform vec4 Display;
varying vec3 vertexColor;
varying vec2 uv;
varying vec3 normal;
void main()
{
    vec3 lightDirection = vec3(0.0, 0.0, 1.0);
    float lambert = max(dot(normalize(lightDirection), normalize(normal)), 0.0);
    vec3 shade = Display.rgb * lambert;
    float p = abs(Display.w);
    vec3 texture = texture2D(Texture, uv).rgb;
    vec3 color = vertexColor;
    gl_FragColor = vec4(mix(color, texture, p) * shade, 1.0);
}`;
}

function InitVertexShader()
{
    let e = document.getElementById('vs');
    let vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, e.value);
    gl.compileShader(vs);
    if(!gl.getShaderParameter(vs, gl.COMPILE_STATUS))
    {
        let e = gl.getShaderInfoLog(vs);
        console.error('Failed init vertex shader: ', e);
        return;
    }
    return vs;
}

function InitShaders()
{
    InitHTMLShaders();
    const vs = InitVertexShader();
    const fs = InitFragmentShader();

    let program = InitShaderProgram(vs, fs);

    if(!ValidateShaderProgram(program))
    {
        return false;
    }
    return CreateGeometryBuffers(program);
}

function InitFragmentShader()
{
    let e = document.getElementById('fs');
    let fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, e.value);
    gl.compileShader(fs);
    
    if(!gl.getShaderParameter(fs, gl.COMPILE_STATUS))
    {
        let e = gl.getShaderInfoLog(fs);
        console.error('Failed init fragmentshader: ', e);
        return;
    }
    return fs;
}

function InitShaderProgram(vs, fs)
{
    let p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);

    if(!gl.getProgramParameter(p, gl.LINK_STATUS))
    {
        console.error(gl.getProgramInfoLog(p));
        alert('Failed linking program');
        return;
    }
    return p;
}

// #endregion Init

function ValidateShaderProgram(p)
{
    gl.validateProgram(p);

    if(!gl.getProgramParameter(p, gl.VALIDATE_STATUS))
    {
        console.error(gl.getProgramInfoLog(p));
        alert('Errors found validating shader program');
        return false;
    }
    return true;
}

function CreateGeometryBuffers(program)
{

    vertices = [];

    CreateGeometryUI();

    CreateVBO(program, new Float32Array(vertices))

    angleGL = gl.getUniformLocation(program, 'Angle');

    CreateTexture(program, 'img/texture.png');

    gl.useProgram(program);
    gl.uniform4fv(angleGL, new Float32Array(angle)); // Perhaps this will lead to errors down the line.

    gl.uniform4fv(displayGL, new Float32Array(display));

    Render();
}

function CreateGeometryUI() {
    const ew = document.getElementById("w");
    const w = ew ? ew.value : 1.0;
    const eh = document.getElementById("h");
    const h = eh ? eh.value : 1.0;
    const ed = document.getElementById("d");
    const d = ed ? ed.value : 1.0;
    const er = document.getElementById("r");
    const r = er ? er.value : 0.5;
    let e = document.getElementById('shape');

    const subdivisionOptions = document.getElementsByClassName("subdivision-options")[0];
    if (!subdivisionOptions.classList.contains("hidden")) {
        subdivisionOptions.classList.add("hidden");
    }

    let html = "";

    switch (e.selectedIndex) {
        case 0: // Triangle
            CreateColorElements(3);
            colors = GetRGBValuesFromHTMLByClassName("color", 3);
            CreateTriangle(w, h, colors);
            html = `
                <div class="geometry-ui-item">
                    <label>Width: </label><input type="number" id="w" value="${w}" onchange="InitShaders();">
                </div>
                <div class="geometry-ui-item">
                    <label>Height: </label><input type="number" id="h" value="${h}" onchange="InitShaders();">
                </div>
            `;
            break;
        case 1: // Quad
            CreateColorElements(4);
            colors = GetRGBValuesFromHTMLByClassName("color", 4);
            CreateQuad(w, h, colors);
            html = `
                <div class="geometry-ui-item">
                    <label>Width: </label><input type="number" id="w" value="${w}" onchange="InitShaders();">
                </div>
                <div class="geometry-ui-item">
                    <label>Height: </label><input type="number" id="h" value="${h}" onchange="InitShaders();">
                </div>
            `;
            break;
        case 2: // Cube
            CreateColorElements(6);
            colors = GetRGBValuesFromHTMLByClassName("color", 6);
            CreateCube(w, h, d, colors);
            html = `
                <div class="geometry-ui-item">
                    <label>Width: </label><input type="number" id="w" value="${w}" onchange="InitShaders();">
                </div>
                <div class="geometry-ui-item">
                    <label>Height: </label><input type="number" id="h" value="${h}" onchange="InitShaders();">
                </div>
                <div class="geometry-ui-item">
                    <label>Depth: </label><input type="number" id="d" value="${d}" onchange="InitShaders();">
                </div>
            `;
            subdivisionOptions.classList.remove("hidden");
            break;
        case 3: // Cylinder
            CreateColorElements(4);
            colors = GetRGBValuesFromHTMLByClassName("color", 4);
            CreateCylinder(r, h, colors);
            html = `
                <div class="geometry-ui-item">
                    <label>Radius: </label><input type="number" id="r" value="${r}" onchange="InitShaders();">
                </div>
                <div class="geometry-ui-item">
                    <label>Height: </label><input type="number" id="h" value="${h}" onchange="InitShaders();">
                </div>
            `;
            subdivisionOptions.classList.remove("hidden");
            break;
    }

    document.getElementById("ui").innerHTML = html;
}

function CreateVBO(program, vert)
{
    let vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vert, gl.STATIC_DRAW);
    const s = 11 * Float32Array.BYTES_PER_ELEMENT; // Updated stride

    let p = gl.getAttribLocation(program, 'Pos');
    gl.vertexAttribPointer(p, 3, gl.FLOAT, gl.FALSE, s, 0);
    gl.enableVertexAttribArray(p);

    const o = 3 * Float32Array.BYTES_PER_ELEMENT;
    let c = gl.getAttribLocation(program, 'Color');
    gl.vertexAttribPointer(c, 3, gl.FLOAT, gl.FALSE, s, o);
    gl.enableVertexAttribArray(c);

    const o2 = o + 3 * Float32Array.BYTES_PER_ELEMENT;
    let u = gl.getAttribLocation(program, 'UV');
    gl.vertexAttribPointer(u, 2, gl.FLOAT, gl.FALSE, s, o2);
    gl.enableVertexAttribArray(u);

    const o3 = o2 + 2 * Float32Array.BYTES_PER_ELEMENT;
    let n = gl.getAttribLocation(program, 'Normal');
    gl.vertexAttribPointer(n, 3, gl.FLOAT, gl.FALSE, s, o3);
    gl.enableVertexAttribArray(n);
}

function Render()
{
    gl.clearColor(0.0, 0.4, 0.6, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT |
             gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 11);
}


// #region Add...

function AddVertex(x, y, z, r, g, b, u, v, nx, ny, nz)
{
    const index = vertices.length;
    vertices.length += 11;
    vertices[index + 0] = x;
    vertices[index + 1] = y;
    vertices[index + 2] = z;
    vertices[index + 3] = r;
    vertices[index + 4] = g;
    vertices[index + 5] = b;
    vertices[index + 6] = u;
    vertices[index + 7] = v;
    vertices[index + 8] = nx;
    vertices[index + 9] = ny;
    vertices[index + 10]= nz;
}

function AddTriangle(x1, y1, z1, r1, g1, b1, u1, v1,
                     x2, y2, z2, r2, g2, b2, u2, v2,
                     x3, y3, z3, r3, g3, b3, u3, v3, normal)
{
    console.log("AddTriangle:", {
        vertex1: { position: [x1, y1, z1], color: [r1, g1, b1], uv: [u1, v1], normal },
        vertex2: { position: [x2, y2, z2], color: [r2, g2, b2], uv: [u2, v2], normal },
        vertex3: { position: [x3, y3, z3], color: [r3, g3, b3], uv: [u3, v3], normal }
    });
    // Add vertices with normals
    AddVertex(x1, y1, z1, r1, g1, b1, u1, v1, normal[0], normal[1], normal[2]);
    AddVertex(x2, y2, z2, r2, g2, b2, u2, v2, normal[0], normal[1], normal[2]);
    AddVertex(x3, y3, z3, r3, g3, b3, u3, v3, normal[0], normal[1], normal[2]);
}

function AddQuad(x1, y1, z1, r1, g1, b1, u1, v1,
                 x2, y2, z2, r2, g2, b2, u2, v2,
                 x3, y3, z3, r3, g3, b3, u3, v3,
                 x4, y4, z4, r4, g4, b4, u4, v4)
{
    // Calculate edges
    const edge1 = [x2 - x1, y2 - y1, z2 - z1];
    const edge2 = [x4 - x1, y4 - y1, z4 - z1];

    // Calculate normal
    const normal = [
        edge1[1] * edge2[2] - edge1[2] * edge2[1],
        edge1[2] * edge2[0] - edge1[0] * edge2[2],
        edge1[0] * edge2[1] - edge1[1] * edge2[0]
    ];

    // Normalize the normal
    const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
    normal[0] /= length;
    normal[1] /= length;
    normal[2] /= length;

    AddTriangle(x1, y1, z1, r1, g1, b1, u1, v1,
                x2, y2, z2, r2, g2, b2, u2, v2,
                x3, y3, z3, r3, g3, b3, u3, v3, normal);

    AddTriangle(x3, y3, z3, r3, g3, b3, u3, v3,
                x4, y4, z4, r4, g4, b4, u4, v4,
                x1, y1, z1, r1, g1, b1, u1, v1, normal);
}

function AddSubdividedQuad(v1, v2, v3, v4, baseColor, divisions = 1) {
    const lerp = (a, b, t) => a + (b - a) * t;
    const checkerboard = document.getElementById("checkerboard").checked;

    const quadCenter = [
        (v1[0] + v2[0] + v3[0] + v4[0]) / 4,
        (v1[1] + v2[1] + v3[1]) / 4,
        (v1[2] + v2[2] + v3[2]) / 4
    ];

    for (let i = 0; i < divisions; i++) {
        let ti0 = i / divisions;
        let ti1 = (i + 1) / divisions;

        let leftStart = [
            lerp(v1[0], v4[0], ti0),
            lerp(v1[1], v4[1], ti0),
            lerp(v1[2], v4[2], ti0)
        ];
        let leftEnd = [
            lerp(v1[0], v4[0], ti1),
            lerp(v1[1], v4[1], ti1),
            lerp(v1[2], v4[2], ti1)
        ];

        let rightStart = [
            lerp(v2[0], v3[0], ti0),
            lerp(v2[1], v3[1], ti0),
            lerp(v2[2], v3[2], ti0)
        ];
        let rightEnd = [
            lerp(v2[0], v3[0], ti1),
            lerp(v2[1], v3[1], ti1),
            lerp(v2[2], v3[2], ti1)
        ];

        for (let j = 0; j < divisions; j++) {
            let tj0 = j / divisions;
            let tj1 = (j + 1) / divisions;

            let p1 = [
                lerp(leftStart[0], rightStart[0], tj0),
                lerp(leftStart[1], rightStart[1], tj0),
                lerp(leftStart[2], rightStart[2], tj0)
            ];
            let p2 = [
                lerp(leftStart[0], rightStart[0], tj1),
                lerp(leftStart[1], rightStart[1], tj1),
                lerp(leftStart[2], rightStart[2], tj1)
            ];
            let p3 = [
                lerp(leftEnd[0], rightEnd[0], tj1),
                lerp(leftEnd[1], rightEnd[1], tj1),
                lerp(leftEnd[2], rightEnd[2], tj1)
            ];
            let p4 = [
                lerp(leftEnd[0], rightEnd[0], tj0),
                lerp(leftEnd[1], rightEnd[1], tj0),
                lerp(leftEnd[2], rightEnd[2], tj0)
            ];

            let color = [0, 0, 0];

            if(checkerboard)
            {
                let isLight = (i + j) % 2 === 0;
                for(let k = 0; k < 3; k++)
                {
                    color[k] = isLight ? baseColor[k] * 0.8 + 0.2 : baseColor[k] * 0.4;
                }
            }
            else
            {
                // Gradient from center of quad
                const cx = (p1[0] + p2[0] + p3[0] + p4[0]) / 4;
                const cy = (p1[1] + p2[1] + p3[1] + p4[1]) / 4;
                const cz = (p1[2] + p2[2] + p3[2] + p4[2]) / 4;
                const dx = cx - quadCenter[0];
                const dy = cy - quadCenter[1];
                const dz = cz - quadCenter[2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                const fade = Math.min(1, dist / 0.75); // 0.75 is an arbitrary fade range
                for (let k = 0; k < 3; k++) {
                    color[k] = baseColor[k] * (1 - fade);
                }
            }
            // Calculate UV coordinates for the sub-quad.

            // const uStart = j / divisions;
            // const uEnd = (j + 1) / divisions;
            // const vStart = (divisions - i) / divisions; // Top edge
            // const vEnd = (divisions - (i + 1)) / divisions; // Bottom edge

            const uStart = ti0;
            const uEnd = ti1;
            const vStart = 1.0 - tj0; // Top edge
            const vEnd = 1.0 - tj1; // Bottom edge

            AddQuad(
                p1[0], p1[1], p1[2], ...color, uStart, vStart,
                p2[0], p2[1], p2[2], ...color, uStart, vEnd,
                p3[0], p3[1], p3[2], ...color, uEnd, vEnd,
                p4[0], p4[1], p4[2], ...color, uEnd, vStart
            );

            // Create a color offset based on i and j to slightly vary the base color
            // let variationFactor = 0.2;
            // let r = baseColor[0] + (i - divisions / 2) * variationFactor;
            // let g = baseColor[1] + (j - divisions / 2) * variationFactor;
            // let b = baseColor[2] + ((i + j) - divisions) * variationFactor;

            // // Clamp values to [0, 1]
            // r = Math.min(1, Math.max(0, r));
            // g = Math.min(1, Math.max(0, g));
            // b = Math.min(1, Math.max(0, b));

            // AddQuad(
            //     p1[0], p1[1], p1[2], r, g, b,
            //     p2[0], p2[1], p2[2], r, g, b,
            //     p3[0], p3[1], p3[2], r, g, b,
            //     p4[0], p4[1], p4[2], r, g, b
            // );
        }
    }
}


// #endregion Add...

//#region Create Geometry

function CreateTriangle(width, height, colors)
{
    vertices.length = 0;
    const w = width * 0.5;
    const h = height * 0.5;
    AddTriangle(0.0,  h, 0.0, ...colors[0], 0.5, 1.0,
                 -w, -h, 0.0, ...colors[1], 0.0, 0.0,
                  w, -h, 0.0, ...colors[2], 1.0, 0.0, [0.0, 0.0, 1.0]);
}

function CreateQuad(width, height, colors)
{
    vertices.length = 0;
    const w = width * 0.5;
    const h = height * 0.5;
    AddQuad(-w, h, 0.0, ...colors[0], 0.0, 1.0,
            -w,-h, 0.0, ...colors[1], 0.0, 0.0,
             w,-h, 0.0, ...colors[2], 1.0, 0.0,
             w, h, 0.0, ...colors[3], 1.0, 1.0);
}

function CreateCube(width, height, depth, colors) {
    vertices.length = 0;
    const w = width * 0.5;
    const h = height * 0.5;
    const d = depth * 0.5;
    let subdivisions = 1;
    if (document.getElementById("subdivision-checkbox").checked)
        subdivisions = parseInt(document.getElementById("subdivision-level")?.value || "1");

    // Front (+Z)
    AddSubdividedQuad(
        [-w,  h, d], // Top-left
        [-w, -h, d], // Bottom-left
        [ w, -h, d], // Bottom-right
        [ w,  h, d], // Top-right
        colors[0],
        subdivisions
    );

    // Back (-Z)
    AddSubdividedQuad(
        [ w,  h, -d], // Top-left
        [ w, -h, -d], // Top-right
        [-w, -h, -d], // Bottom-right
        [-w,  h, -d], // Bottom-left
        colors[1],
        subdivisions
    );

    // Top (+Y)
    AddSubdividedQuad(
        [-w,  h, -d], // Top-left
        [-w,  h,  d], // Bottom-left
        [ w,  h,  d], // Bottom-right
        [ w,  h, -d], // Top-right
        colors[2],
        subdivisions
    );

    // Bottom (-Y)
    AddSubdividedQuad(
        [-w, -h,  d], // Top-left
        [-w, -h, -d], // Bottom-left
        [ w, -h, -d], // Bottom-right
        [ w, -h,  d], // Top-right
        colors[3],
        subdivisions
    );

    // Right (+X)
    AddSubdividedQuad(
        [w,  h,  d], // Top-left
        [w, -h,  d], // Bottom-left
        [w, -h, -d], // Bottom-right
        [w,  h, -d], // Top-right
        colors[4],
        subdivisions
    );

    // Left (-X)
    AddSubdividedQuad(
        [-w,  h, -d], // Top-left
        [-w, -h, -d], // Bottom-left
        [-w, -h,  d], // Bottom-right
        [-w,  h,  d], // Top-right
        colors[5],
        subdivisions
    );
}

function CreateCylinder(radius, height, colors) {
    vertices.length = 0;
    const subdivisions = document.getElementById("subdivision-checkbox").checked
        ? parseInt(document.getElementById("subdivision-level")?.value || "1")
        : 1;

    const segments = Math.max(3, subdivisions * 6); // Minimum 3 segments for a cylinder
    const halfHeight = height * 0.5;

    // Generate top and bottom circle center points
    const topCenter = [0, halfHeight, 0];
    const bottomCenter = [0, -halfHeight, 0];

    const angleStep = (2 * Math.PI) / segments;

    const topVertices = [];
    const bottomVertices = [];

    for (let i = 0; i < segments; i++) {
        const angle = i * angleStep;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);

        topVertices.push([x, halfHeight, z]);
        bottomVertices.push([x, -halfHeight, z]);
    }

    // Add side faces and reuse vertices for top and bottom faces
    for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments; // Wrap around to the first vertex after the last

        // Ensure consistent UV mapping for the first and last segments
        const uStart = i / segments;
        const uEnd = next / segments;

        // Precompute trigonometric values for reuse
        const cosCurrent = Math.cos(i * angleStep);
        const sinCurrent = Math.sin(i * angleStep);
        const cosNext = Math.cos(next * angleStep);
        const sinNext = Math.sin(next * angleStep);

        // Precompute UV coordinates for reuse
        const uCurrent = 0.5 + 0.5 * cosCurrent;
        const vCurrent = 0.5 + 0.5 * sinCurrent;
        const uNext = 0.5 + 0.5 * cosNext;
        const vNext = 0.5 + 0.5 * sinNext;


        // Add side face
        AddQuad(
            topVertices[i][0], topVertices[i][1], topVertices[i][2], ...colors[2], uStart, 1.0, // Top-left
            bottomVertices[i][0], bottomVertices[i][1], bottomVertices[i][2], ...colors[3], uStart, 0.0, // Bottom-left
            bottomVertices[next][0], bottomVertices[next][1], bottomVertices[next][2], ...colors[3], uEnd, 0.0, // Bottom-right
            topVertices[next][0], topVertices[next][1], topVertices[next][2], ...colors[2], uEnd, 1.0 // Top-right
        );

        // Add top face triangle
        AddTriangle(
            0, halfHeight, 0, ...colors[0], 0.5, 0.5, // Center vertex
            topVertices[i][0], topVertices[i][1], topVertices[i][2], ...colors[0], uCurrent, vCurrent, // Current vertex
            topVertices[next][0], topVertices[next][1], topVertices[next][2], ...colors[0], uNext, vNext,
            [0.0, -1.0, 0.0] // Next vertex
        );

        // Add bottom face triangle
        AddTriangle(
            0, -halfHeight, 0, ...colors[1], 0.5, 0.5, // Center vertex
            bottomVertices[next][0], bottomVertices[next][1], bottomVertices[next][2], ...colors[1], uNext, vNext, // Next vertex
            bottomVertices[i][0], bottomVertices[i][1], bottomVertices[i][2], ...colors[1], uCurrent, vCurrent,
            [0.0, 1,0, 0.0] // Current vertex
        );
    }
}

//#endregion Create Geometry


function SubdivideGeomtry(geometry)
{
    let newGeometry = {
        vertices: [...geometry.vertices],
        faces: []
    };

    for(let face of geometry.faces)
    {
        const v0 =  geometry.vertices[face[0]];
        const v1 =  geometry.vertices[face[1]];
        const v2 =  geometry.vertices[face[2]];
        const v3 =  geometry.vertices[face[3]];

        const faceCenter = {
            x: (v0.x + v1.x + v2.x + v3.x) / 4,
            y: (v0.y + v1.y + v2.y + v3.y) / 4,
            z: (v0.z + v1.z + v2.z + v3.z) / 4
        };

        const centerIndex = newGeometry.vertices.length;
        newGeometry.vertices.push(faceCenter);

        newGeometry.faces.push([face[0], face[1], centerIndex, face[0]]);
        newGeometry.faces.push([face[1], face[2], centerIndex, face[1]]);
        newGeometry.faces.push([face[2], face[3], centerIndex, face[2]]);
        newGeometry.faces.push([face[3], face[0], centerIndex, face[3]]);
    }

    return newGeometry;
}

function GeometryToVertices(geometry)
{
    vertices.length = 0;
    for(let face of geometry.faces)
    {
        for(let i = 0; i < face.length-1; i++)
        {
            const v0 = geometry.vertices[face[0]];
            const v1 = geometry.vertices[face[i]];
            const v2 = geometry.vertices[face[i + 1]];
            AddTriangle(v0.x, v0.y, v0.z, 1.0, 0.0, 0.0,
                        v1.x, v1.y, v1.z, 0.0, 1.0, 0.0,
                        v2.x, v2.y, v2.z, 0.0, 0.0, 1.0);
        }
    }
}

function HexToRGB(hex)
{
    let tempHex = hex.replace('#', '');
    if(tempHex.length === 3)
    {
        tempHex += tempHex;
    }
    const r = parseInt(tempHex.substring(0, 2), 16)/255.0;
    const g = parseInt(tempHex.substring(2, 4), 16)/255.0;
    const b = parseInt(tempHex.substring(4, 6), 16)/255.0;

    return [r, g, b];
}

function GetRGBValuesFromHTMLByClassName(className, numberOfFacesOrPoints)
{
    const colorHTML = document.getElementsByClassName(className);
    const colors = [];
    if(!colorHTML || colorHTML.length == 0 || colorHTML === undefined)
    {
        for(let i = 0; i < numberOfFacesOrPoints; i++)
        {
            colors.push([1.0, 1.0, 1.0]);
        }
        return colors;
    }

    for(let i = 0; i < colorHTML.length; i++)
    {
        const color = colorHTML[i].value;
        colors.push(HexToRGB(color));
    }

    if(colorHTML.length < numberOfFacesOrPoints)
    {
        for(let i = colorHTML.length; i < numberOfFacesOrPoints; i++)
        {
            colors.push([1.0, 1.0, 1.0]);
        }
    }
    return colors;
}

function CreateColorElements(numberOfColorElements)
{
    var preset = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"];
    var stringArrOfPreferredColors = [];
    try {
        document.getElementsByClassName("color").forEach((e) => {
            stringArrOfPreferredColors.push(e.value);
        });
    } catch(e) {
    }

    const colorsContainer = document.getElementById("colors-container");
    
    let offset = 0;
    if(colorsContainer.childElementCount > 0 &&
       colorsContainer.childElementCount < numberOfColorElements)
    {
        offset = colorsContainer.childElementCount;
    }
    else if(colorsContainer.childElementCount > numberOfColorElements)
    {
        let e = document.getElementsByClassName("color-item");
        for(let i = e.length; i > numberOfColorElements; i--)
        {
            colorsContainer.removeChild(e[i-1]);
        }
        return;
    }
    

    if(numberOfColorElements == colorsContainer.childElementCount)
    {
        return;
    }

    for(let i = offset; i < numberOfColorElements; i++)
    {
        const div = document.createElement("div");
        div.classList.add("color-item");
        const label = document.createElement("label");
        label.innerText = `Color ${i + 1}: `;
        const input = document.createElement("input");
        input.type = "color";
        input.classList.add("color");
        input.value = stringArrOfPreferredColors[i] || preset[i];
        input.onchange = function() {
            InitShaders();
        };

        div.appendChild(label);
        div.appendChild(input);
        colorsContainer.appendChild(div);
    }
}

function CreateTexture(prog, url)
{
    const texture = LoadTexture(url);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    textureGl = gl.getUniformLocation(prog, 'Texture');
    displayGL = gl.getUniformLocation(prog, 'Display');
}

function LoadTexture(url)
{
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const pixel = new Uint8Array([0, 0, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
    gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    const image = new Image();
    image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
    gl.RGBA, gl.UNSIGNED_BYTE, image);
    SetTextureFilters(image);
    };
    image.src = url;
    return texture;
}

function SetTextureFilters(image)
{
    if (IsPow2(image.width) && IsPow2(image.height))
    {
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    else
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
}

function IsPow2(value)
{
    return (value & (value - 1)) === 0;
}

function Update()
{
    const t = document.getElementById('texture');
    display[3] = t.checked ? 1.0 : 0.0;

    const l = document.getElementById('l').value;
    display[0] = parseInt(l.substring(1,3),16) / 255.0;
    display[1] = parseInt(l.substring(3,5),16) / 255.0;
    display[2] = parseInt(l.substring(5,7),16) / 255.0;

    gl.uniform4fv(displayGL, new Float32Array(display));
    Render();
}