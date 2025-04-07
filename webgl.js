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
        angle[0] -= (mouseY - e.y) * 0.1;
        angle[1] -= (mouseX - e.x) * 0.1;
        gl.uniform4fv(angleGL, new Float32Array(angle));
        Render();
    }
    mouseX = e.x;
    mouseY = e.y;
});

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

    CreateGeomtryUI();

    CreateVBO(program, new Float32Array(vertices))

    angleGL = gl.getUniformLocation(program, 'Angle');

    gl.useProgram(program);

    Render();
}

function CreateGeomtryUI() {
    const ew = document.getElementById("w");
    const w = ew ? ew.value : 1.0;
    const eh = document.getElementById("h");
    const h = eh ? eh.value : 1.0;
    const ed = document.getElementById("d");
    const d = ed ? ed.value : 1.0;
    let e = document.getElementById('shape');

    const subdivisionOptions = document.getElementsByClassName("subdivision-options")[0];
    if(!subdivisionOptions.classList.contains("hidden"))
        subdivisionOptions.classList.add("hidden");

    switch(e.selectedIndex)
    {
        case 0:
            CreateColorElements(3);
            colors = GetRGBValuesFromHTMLByClassName("color", 3);
            CreateTriangle(w, h, colors);
            break;
        case 1:
            CreateColorElements(4);
            colors = GetRGBValuesFromHTMLByClassName("color", 4);
            CreateQuad(w, h, colors);
            break;
        case 2:
            CreateColorElements(6);
            colors = GetRGBValuesFromHTMLByClassName("color", 6);
            CreateCube(w, h, d, colors); subdivisionOptions.classList.remove("hidden");
            break;
    }

    let html = `
    <div class="geometry-ui-item">
        <label>Width: </label><input type="number" id="w" value = "${w}" onchange="InitShaders();">
    </div>
    <div class="geometry-ui-item">
        <label>Height: </label><input type="number" id="h" value = "${h}" onchange="InitShaders();">
    </div>
    `;
    if(e.selectedIndex == 3)
    {
        html += `
            <div class="geometry-ui-item">
                <label>Depth: </label>
                <input type="number" id="d" value = "${d}" onchange="InitShaders();">
            </div>
        `;
    }
    document.getElementById("ui").innerHTML = html;
    const doSubvision = document.getElementById("subdivision-checkbox").checked;
    if(doSubvision)
        geometry = SubdivideGeomtry(geometry);
}

function CreateVBO(program, vert)
{
    let vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER,vert,gl.STATIC_DRAW);
    const s = 6 * Float32Array.BYTES_PER_ELEMENT;

    let p = gl.getAttribLocation(program, 'Pos');
    gl.vertexAttribPointer(p,3,gl.FLOAT,gl.FALSE,s,0);
    gl.enableVertexAttribArray(p);

    const o = 3 * Float32Array.BYTES_PER_ELEMENT;
    let c = gl.getAttribLocation(program, 'Color');
    gl.vertexAttribPointer(c,3,gl.FLOAT,gl.FALSE,s,o);
    gl.enableVertexAttribArray(c);
}

function Render()
{
    gl.clearColor(0.0, 0.4, 0.6, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT |
             gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 6);
}


// #region Add...

function AddVertex(x, y, z, r, g, b)
{
    const index = vertices.length;
    vertices.length += 6;
    vertices[index + 0] = x;
    vertices[index + 1] = y;
    vertices[index + 2] = z;
    vertices[index + 3] = r;
    vertices[index + 4] = g;
    vertices[index + 5] = b;
}

function AddTriangle(x1, y1, z1, r1, g1, b1,
                     x2, y2, z2, r2, g2, b2,
                     x3, y3, z3, r3, g3, b3)
{
    AddVertex(x1, y1, z1, r1, g1, b1);
    AddVertex(x2, y2, z2, r2, g2, b2);
    AddVertex(x3, y3, z3, r3, g3, b3);
}

function AddQuad(x1, y1, z1, r1, g1, b1,
                 x2, y2, z2, r2, g2, b2,
                 x3, y3, z3, r3, g3, b3,
                 x4, y4, z4, r4, g4, b4)
{
    AddTriangle(x1,y1,z1,r1,g1,b1,
                x2,y2,z2,r2,g2,b2,
                x3,y3,z3,r3,g3,b3);

    AddTriangle(x3,y3,z3,r3,g3,b3,
                x4,y4,z4,r4,g4,b4,
                x1,y1,z1,r1,g1,b1);
}

function AddSubdividedQuad(v1, v2, v3, v4, baseColor, divisions = 1) {
    const lerp = (a, b, t) => a + (b - a) * t;
    const checkerboard = document.getElementById("checkerboard").checked;

    const quadCenter = [
        (v1[0] + v2[0] + v3[0] + v4[0]) / 4,
        (v1[1] + v2[1] + v3[1] + v4[1]) / 4,
        (v1[2] + v2[2] + v3[2] + v4[2]) / 4
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

            AddQuad(
                    p1[0], p1[1], p1[2], color[0], color[1], color[2],
                    p2[0], p2[1], p2[2], color[0], color[1], color[2],
                    p3[0], p3[1], p3[2], color[0], color[1], color[2],
                    p4[0], p4[1], p4[2], color[0], color[1], color[2]
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
    AddTriangle(0.0,  h, 0.0, ...colors[0],
                 -w, -h, 0.0, ...colors[1],
                  w, -h, 0.0, ...colors[2],);
}

function CreateQuad(width, height, colors)
{
    vertices.length = 0;
    const w = width * 0.5;
    const h = height * 0.5;
    AddQuad(-w, h, 0.0, ...colors[0],
            -w,-h, 0.0, ...colors[1],
             w,-h, 0.0, ...colors[2],
             w, h, 0.0, ...colors[3]);
}

function CreateCube(width, height, depth, colors)
{
    vertices.length = 0;
    const w = width * 0.5;
    const h = height * 0.5;
    const d = depth * 0.5;

    const subdivisions = parseInt(document.getElementById("subdivision-level")?.value || "1");

    // Front (+Z)
    AddSubdividedQuad(
        [-w, -h,  d],
        [ w, -h,  d],
        [ w,  h,  d],
        [-w,  h,  d],
        colors[0],
        subdivisions
    );

    // Back (-Z)
    AddSubdividedQuad(
        [ w, -h, -d],
        [-w, -h, -d],
        [-w,  h, -d],
        [ w,  h, -d],
        colors[1],
        subdivisions
    );

    // Top (+Y)
    AddSubdividedQuad(
        [-w,  h,  d],
        [ w,  h,  d],
        [ w,  h, -d],
        [-w,  h, -d],
        colors[2],
        subdivisions
    );

    // Bottom (-Y)
    AddSubdividedQuad(
        [-w, -h, -d],
        [ w, -h, -d],
        [ w, -h,  d],
        [-w, -h,  d],
        colors[3],
        subdivisions
    );

    // Right (+X)
    AddSubdividedQuad(
        [ w, -h,  d],
        [ w, -h, -d],
        [ w,  h, -d],
        [ w,  h,  d],
        colors[4],
        subdivisions
    );

    // Left (-X)
    AddSubdividedQuad(
        [-w, -h, -d],
        [-w, -h,  d],
        [-w,  h,  d],
        [-w,  h, -d],
        colors[5],
        subdivisions
    );
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
    console.log("Color HTML: ", colorHTML);
    console.log("Number of faces or points: ", numberOfFacesOrPoints);
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
    console.log("Colors: ", colors);
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
        console.log("Creating new color elements");
    }

    const colorsContainer = document.getElementById("colors-container");
    
    let offset = 0;
    if(colorsContainer.childElementCount > 0 &&
       colorsContainer.childElementCount < numberOfColorElements)
    {
        offset = colorsContainer.childElementCount;
        console.log("Offset: ", offset);
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
        console.log("Already created colors container");
        return;
    }

    for(let i = offset; i < numberOfColorElements; i++)
    {
        console.log("number of color elements: ", numberOfColorElements);
        console.log("i: ", i);
        console.log("Child element Count: ", colorsContainer.childElementCount);
        console.log("Creating color item: ", i + 1);

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