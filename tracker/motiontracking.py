# follow http://opencv-python-tutroals.readthedocs.io/en/latest/py_tutorials/py_calib3d/py_calibration/py_calibration.html

# also see https://github.com/opencv/opencv/blob/master/samples/python/calibrate.py

#idea: 
# get camera feed
# undistort to get straight lines
# motion detection
# filter (kalman?) to get rid of mirror images
# get the mid bottom point of the blob, which is the position
# perspective transform that position
# 
# use https://github.com/umlaeute/v4l2loopback to also stream the video over webRTC
# use vlc (although slow) or uv4l http://www.linux-projects.org/uv4l/ which may be better (for rpi) or janus https://www.rs-online.com/designspark/building-a-raspberry-pi-2-webrtc-camera

import sys
import cv2
import numpy as np
import itertools
import websocket
import json
import thread

# ws = None
ws = websocket.WebSocket()
# ws.connect("ws://192.168.1.180:13900")
ws.connect("ws://localhost:13900")

cmd = ''
fileName = 'first.avi'
fourcc = cv2.cv.CV_FOURCC('M','J','P','G')
# fourcc = cv2.cv.CV_FOURCC('X','V','I','D')
# fourcc = cv2.cv.CV_FOURCC('D','I','V','X')
out = cv2.VideoWriter(fileName, fourcc, 30.0, (640,480))

def on_message(ws, message):
    global cmd, out
    data = json.loads(message)
    # print data['topic']
    if (data['topic'] == 'figure'):
        if (data['data'] != ''):
            print data['data']
            line = data['data']['cmd']
            if line != '':
                cmd = line
            # cmd = data['data']
    if (data['topic'] == 'start'):
        if (data['data'] != ''):
            f = 'F' + str(data['data']['meta']['test'])
            n = data['data']['member']['firstName']
            fileName = f+'_'+n+'.avi'
            out.release()
            out = cv2.VideoWriter(fileName, fourcc, 30.0, (640,480))
            print 'starting ' + fileName

def on_error(ws, error):
    print error

def on_close(ws):
    print "### closed ###"

def on_open(ws):
    ws.send('{"type":"subscribe","node":"default"}')

def run(*args):
    ws = websocket.WebSocketApp("ws://localhost:13900/",
                                on_message = on_message,
                                on_error = on_error,
                                on_close = on_close)
    ws.on_open = on_open

    ws.run_forever()

# start the websocket
thread.start_new_thread(run, ())


videofile = sys.argv[1]
datafile = sys.argv[2]

#manually setting ring boundaries
scale = 1
offset = [0,0]
rect = [[380,1400],[-10,95],[260,90],[830,230]]
rect = [[380,1370],[-10,75],[260,60],[830,200]]
M = cv2.getPerspectiveTransform(np.array(rect,np.float32), np.array([[0,0],[400,0],[400,200],[0,200]],np.float32))
dragging = False
data = {'M': M.tolist(), 'points': []}

print json.dumps(data)

# bounding rect of all contours -> cluster
def findRects(contours):
    # print len(contours)
    rects = [cv2.boundingRect(ctr) for ctr in contours]
    return [((r[0],r[1]),(r[0]+r[2],r[1]+r[3])) for r in rects]
    # result = [(1000,1000),(0,0)]
    # for rect in rects:
    #     result[0] = (min(result[0][0],rect[0]), min(result[0][1],rect[1]))
    #     result[1] = (max(result[1][0],rect[0]+rect[2]), max(result[1][1],rect[1]+rect[3]))

    # return [result]

# bottom of a rect
def bottom(rect):
    (p1,p2) = rect
    return ((p1[0]+p2[0])/2, max(p1[1],p2[1]))

# center of a rect ((x1,y1),(x2,y2)) => (cx,cy)
def center(rect):
    (p1,p2) = rect
    return ((p1[0]+p2[0])/2,(p1[1]+p2[1])/2)

def findPoint(rect, point):
    for index, coord in enumerate(rect):
        if (abs(coord[0] - point[0]) < 20) & (abs(coord[1] - point[1]) < 20):
            return index
    return -1

#define perspective area we need to transform to
def onmouse(event,x,y,flags,param):
    global rect, M, dragging, scale, offset, data

    # transform x, y to video coordinates
    x = (x - offset[0])/scale
    y = (y - offset[1])/scale

    index = findPoint(rect,[x,y])

    if (event == cv2.EVENT_MOUSEMOVE) & dragging:
        if (index != -1):
            rect[index] = [x,y]
    if event == cv2.EVENT_LBUTTONUP:
        dragging = False
    if event == cv2.EVENT_LBUTTONDOWN:
        if (index == -1):
            rect.append([x,y])
        else:
            dragging = True

        # print rect

    if event == cv2.EVENT_RBUTTONDOWN:
        rect = []
        M = None

    if len(rect) == 4:
        M = cv2.getPerspectiveTransform(np.array(rect,np.float32), np.array([[0,0],[400,0],[400,200],[0,200]],np.float32))
        data['M'] = M.tolist()
        # print M

def onresult(ws, points, M):
    global data
    # print json.dumps(points)
    ws.send('{"type":"publish","node":"default","topic":"location","data":{"points":'+json.dumps(points)+', "matrix":'+json.dumps(M.tolist())+'}}')

def transformPoint(matrix, point):
    r = np.dot(M, [point[0],point[1],1])
    return [r[0]/r[2], r[1]/r[2]]

def projectPoint(point, scale, size):
    (w,h) = size
    x = int(round(w * (1-scale)/2))
    y = int(round(h * (1-scale)/2))
    return [x+int(round(point[0]*scale)), y+int(round(point[1]*scale))]


def drawBounds(dst, rect, scale):
    h,w,_ = dst.shape
    if len(rect) > 1:
        rect = map(lambda c: projectPoint(c, scale, (w, h)),rect)
        cv2.polylines(dst, np.array([rect]), True, (0,255,0), 2)

    return dst



def drawRects(img, rects):
    for r in rects:
        (p1, p2) = r
        p3 = bottom((p1,p2))
        cv2.rectangle(img, p1, p2, (0,255,0), 2)
        cv2.circle(img, p3, 4, (255,0,0), -1)

    return img


def getDeltaContours(lastFrame, img, gray):
    frameDelta = cv2.absdiff(lastFrame, gray)
    thresh = cv2.threshold(frameDelta, 10, 255, cv2.THRESH_BINARY)[1]
    thresh = cv2.dilate(thresh, None, iterations=8)
    contours, hierarchy = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    rects = findRects(contours)
    bottoms = [bottom(r) for r in rects]
    if len(contours) > 0:
        img = drawRects(img, rects)

    # cv2.imshow('frameDelta',frameDelta)
    return thresh, bottoms


def drawText(img, cmd):
    font = cv2.FONT_HERSHEY_DUPLEX
    y0, dy = 500, 30
    for i, line in enumerate(cmd.split('\n')):
        y = y0 + i*dy
        # cv2.putText(img, line, (10, y ), cv2.FONT_HERSHEY_SIMPLEX, 1, 2)
        cv2.putText(img,line,(10,y), font, 0.8, (255,255,255),1, cv2.CV_AA)

    return img


def scalePadVideo(img, scale):
    h,w,_ = img.shape
    bkg = np.zeros((h,w,3), np.uint8)
    scaled = cv2.resize(img, (0,0), bkg, scale, scale)
    x = int(round(w * (1-scale)/2))
    y = int(round(h * (1-scale)/2))
    offset = [x,y]
    bkg[y:y + scaled.shape[0], x:x + scaled.shape[1]] = scaled
    return bkg


def scaleVideo(img, scale):
    h,w = img.shape
    return cv2.resize(img, (int(scale * w), int(scale * h)))


def run(videofile, ws):
    global scale, offset, cmd, out
    # cap = cv2.VideoCapture(0)
    cap = cv2.VideoCapture(videofile)
    # fourcc = cv2.cv.CV_FOURCC('M','J','P','G')
    # out = cv2.VideoWriter('output.avi', fourcc, 30.0, (800,600))
    lastFrame = None
    cv2.namedWindow("frame", 1)
    cv2.setMouseCallback("frame", onmouse)
    ws.send('{"type":"publish","node":"default","topic":"reset"}')
    while(True):
        # Capture frame-by-frame
        ret, img = cap.read()
        out.write(img)
        if ret == False:
            break

        # create jpg frame for restreaming
        ret, jpeg = cv2.imencode('.jpg', img)
        # TODO: actually stream: http://www.chioka.in/python-live-video-streaming-example/

        # frame = imutils.resize(img, width=500)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (11, 11), 0)

        if lastFrame is not None:
            thresh, bottoms = getDeltaContours(lastFrame, img, gray)

            if M is not None:
                if len(bottoms) > 0:
                    onresult(ws, bottoms, M)
                    data['points'].append(bottoms)
                trans = cv2.warpPerspective(img,M,(400,200))
                cv2.imshow('trans',trans)

            cv2.imshow('delta',scaleVideo(thresh,0.5))


        # cv2.imshow('delta',fgmask)

        bkg = scalePadVideo(img, scale)
        bkg = drawBounds(bkg, rect, scale)
        bkg = drawText(bkg, cmd)

        cv2.imshow('frame',bkg)
        # out.write(bkg)


        lastFrame = gray
        key = cv2.waitKey(1)

        if key & 0xFF == ord('z'):
            scale = max(0.1,scale-0.1)

        if key & 0xFF == ord('x'):
            scale = min(1,scale+0.1)

        if key & 0xFF == ord('q'):
            break


    # When everything done, release the capture
    cap.release()
    out.release()

run(videofile, ws)
# static()
cv2.destroyAllWindows()

# f = open(datafile,'w')
# f.write(json.dumps(data))

# print 'data written to file '+datafile
