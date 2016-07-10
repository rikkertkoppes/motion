# follow http://opencv-python-tutroals.readthedocs.io/en/latest/py_tutorials/py_calib3d/py_calibration/py_calibration.html

# also see https://github.com/opencv/opencv/blob/master/samples/python/calibrate.py

#idea: 
# get camera feed
# undistort to get straight lines
# motion detection
# filter (kalman?) to get rid of mirror images
# get the mid bottom point of the blob, which is the position
# perspective transform that position

import cv2
import numpy as np
import itertools
import websocket

# ws = None
ws = websocket.WebSocket()
ws.connect("ws://192.168.1.180:13900")

def on_message(ws, message):
    print message

def on_error(ws, error):
    print error

def on_close(ws):
    print "### closed ###"

def on_open(ws):
    ws.send('{"type":"subscribe","node":"test"}')


# websocket.enableTrace(True)
# ws = websocket.WebSocketApp("ws://localhost:13900/",
#                           on_message = on_message,
#                           on_error = on_error,
#                           on_close = on_close)
ws.on_message = on_message
ws.on_open = on_open
# ws.run_forever()

rect = []
M = None

def findRect(contours):
    rects = [cv2.boundingRect(ctr) for ctr in contours]
    result = [1000,1000,0,0]
    for rect in rects:
        result[0] = min(result[0],rect[0])
        result[1] = min(result[1],rect[1])
        result[2] = max(result[2],rect[0]+rect[2])
        result[3] = max(result[3],rect[1]+rect[3])

    return (result[0],result[1]),(result[2],result[3])

def bottom(p1,p2):
    return ((p1[0]+p2[0])/2, max(p1[1],p2[1]))

#define perspective area we need to transform to
def onclick(event,x,y,flags,param):
    global rect, M
    if event == cv2.EVENT_LBUTTONDOWN:
        rect.append([x,y])
        # print rect

    if event == cv2.EVENT_RBUTTONDOWN:
        print 'right'
        rect = []
        M = None

    if len(rect) == 4:
        M = cv2.getPerspectiveTransform(np.array(rect,np.float32), np.array([[0,0],[400,0],[400,200],[0,200]],np.float32));
        # print M

def onresult(ws, p):
    print p[0], p[1]
    ws.send('{"type":"publish","node":"test","topic":"location","data":['+str(p[0])+','+str(p[1])+']}')

def run(ws):
    # cap = cv2.VideoCapture(0)
    cap = cv2.VideoCapture('../samples/1.mp4')
    lastFrame = None
    cv2.namedWindow("frame", 1);
    cv2.setMouseCallback("frame", onclick)
    while(True):
        # Capture frame-by-frame
        ret, img = cap.read()
        # frame = imutils.resize(img, width=500)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (11, 11), 0)
        p3 = None

        if lastFrame is not None:
            frameDelta = cv2.absdiff(lastFrame, gray)
            thresh = cv2.threshold(frameDelta, 10, 255, cv2.THRESH_BINARY)[1]
            thresh = cv2.dilate(thresh, None, iterations=2)
            contours, hierarchy = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if len(contours) > 0:
                p1, p2 = findRect(contours)
                p3 = bottom(p1,p2)
                cv2.rectangle(img, p1, p2, (0,255,0), 2)
                cv2.circle(img, p3, 4, (255,0,0), -1)

            if M is not None:
                trans = cv2.warpPerspective(img,M,(400,200))
                cv2.imshow('trans',trans)
                if p3 is not None:
                    r3 = np.dot(M, [p3[0],p3[1],1])
                    onresult(ws,[r3[0]/r3[2], r3[1]/r3[2]])

            if len(rect) > 1:
                cv2.polylines(img, np.array([rect]), True, (0,255,0), 2)

        	# cv2.imshow('frameDelta',frameDelta)
            cv2.imshow('delta',thresh)

        cv2.imshow('frame',img)


        lastFrame = gray

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # When everything done, release the capture
    cap.release()

run(ws)
# static()
cv2.destroyAllWindows()