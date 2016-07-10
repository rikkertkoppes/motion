# follow http://opencv-python-tutroals.readthedocs.io/en/latest/py_tutorials/py_calib3d/py_calibration/py_calibration.html

# also see https://github.com/opencv/opencv/blob/master/samples/python/calibrate.py

#idea: 
# get camera feed
# undistort to get straight lines
# motion detection
# filter (kalman) to get rid of mirror images
# get the mid bottom point of the blob, which is the position
# perspective transform that position

import cv2
import numpy as np

criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)

# prepare object points, like (0,0,0), (1,0,0), (2,0,0) ....,(6,5,0)
objp = np.zeros((6*9,3), np.float32)
objp[:,:2] = np.mgrid[0:9,0:6].T.reshape(-1,2)


def run():
    # cap = cv2.VideoCapture(0)
    # while(True):
        # Capture frame-by-frame
        # ret, img = cap.read()
        img = cv2.imread("./calibration1.png")
        # Arrays to store object points and image points from all the images.
        objpoints = [] # 3d point in real world space
        imgpoints = [] # 2d points in image plane.
        # frame = cv2.flip(frame,1)
        gray = cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
        # Find the chess board corners
        ret, corners = cv2.findChessboardCorners(gray, (9,6),None)

        # If found, add object points, image points (after refining them)
        if ret == True:
            objpoints.append(objp)

            cv2.cornerSubPix(gray,corners,(11,11),(-1,-1),criteria)
            imgpoints.append(corners)

            # Draw and display the corners
            cv2.drawChessboardCorners(img, (9,6), corners,ret)
            print 'found'
        else:
            print 'no'

        cv2.imshow('frame',img)

        ret, mtx, dist, rvecs, tvecs = cv2.calibrateCamera(objpoints, imgpoints, gray.shape[::-1],None,None)
        
        print dist
        # dist = np.array([-0.00222804, 0.00096887, 0, 0, 0]) # no translation
        dist = np.array([-0.00222804, 0.00096887, 0, 0, -0.00012223])

        print mtx

        h,  w = img.shape[:2]
        newcameramtx, roi = cv2.getOptimalNewCameraMatrix(mtx,dist,(w,h),1,(w,h))
        print roi
        dst = cv2.undistort(img, mtx, dist, None, newcameramtx)

        # mapx,mapy = cv2.initUndistortRectifyMap(mtx,dist,None,newcameramtx,(w,h),5)
        # dst = cv2.remap(img,mapx,mapy,cv2.INTER_LINEAR)


        x,y,w,h = roi
        dst = dst[y:y+h, x:x+w]

        cv2.imshow('undistorted',dst)

        cv2.waitKey()
        # if cv2.waitKey(1) & 0xFF == ord('q'):
        #     break

    # When everything done, release the capture
    # cap.release()

run()
# static()
cv2.destroyAllWindows()