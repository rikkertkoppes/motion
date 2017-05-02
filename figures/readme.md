# figures

## installation

- sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++
- npm install

goal: create graphical black/white SDR representations of all figures

- image dimensions must be specified (start 200 x 400)
- SDR width must be specified
- draw only black and white (binary)
- work with caroussel logic?
- we can have the same image for two figures (eg HXK and KXH)
	- do we need some temporal logic?
- maybe use ndarray to store and process the SDRs

##Figures

- gebroken lijn 10 meter links
- gebroken lijn 10 meter rechts
- gebroken lijn 5 meter links
- gebroken lijn 5 meter rechts
- volte A
- volte C
- volte EB
- EB afwenden
- AC afwenden
- van hand veranderen diagonaal


## optimizations

- after the fact, we are able to identify blocks of contiguous activity
- while data comes in, we may at least require some number of frames of activity before recognition