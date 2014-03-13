// RBGA color image data
function RGBA(r, g, b, a) {
	var data = {
		r: r,
		g: g,
		b: b,
		a: a
	};


	this.getData = function () {
		return data;
	};

	this.equals = function (rgba) {
		return r == rgba.r
			&& g == rgba.g
			&& b == rgba.b
			&& a == rgba.a;
	};

	this.toYUV = function () {
		// Define constants
		var Wr = 0.299,
			Wg = 0.587,
			Wb = 0.114,
			Umax = 0.436,
			Vmax = 0.615;

		var y = (Wr * r) + (Wg * g) + (Wb * b),
			u = Umax * ((b - y) / (1 - Wb)),
			v = Vmax * ((r - y) / (1 - Wr));

		return new YUV(y, u, v);
	};

	this.toString = function () {
		return 'rgb(' + r + ',' + g + ',' + b + ')';
		//return ('#' + r.toString(16) + g.toString(16) + b.toString(16)).toUpperCase();
	};
}

// YUV color image data
function YUV(y, u, v) {
	var data = {
		y: y,
		u: u,
		v: v
	};

	this.getData = function () {
		return data;
	};

	// Returns true if the the given yuv is "similar" to this one
	this.isSimilar = function (yuv) {
		var yDiff = 48 / 255,
			uDiff = 7 / 255,
			vDiff = 6 / 255;

		var data = yuv.getData();

		return (y - data.y) < yDiff
			&& (u - data.u) < uDiff
			&& (v - data.v) < vDiff;
	};
}

