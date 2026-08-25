package expo.modules.nativecameraview

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.SurfaceTexture
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CaptureRequest
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import android.view.Surface
import android.view.TextureView
import android.widget.FrameLayout
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

@SuppressLint("ViewConstructor")
class NativeCameraView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val TAG = "NativeCameraView"

  private var cameraId: String? = null
  private var cameraDevice: CameraDevice? = null
  private var captureSession: CameraCaptureSession? = null
  private var backgroundThread: HandlerThread? = null
  private var backgroundHandler: Handler? = null
  private var textureView: TextureView
  private var surfaceReady = false
  private var opening = false

  private val onCameraError by EventDispatcher<Map<String, Any?>>()
  private val onCameraConnected by EventDispatcher<Map<String, Any?>>()

  init {
    textureView = TextureView(context)
    textureView.surfaceTextureListener = object : TextureView.SurfaceTextureListener {
      override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
        surfaceReady = true
        startIfReady()
      }

      override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {}

      override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean {
        surfaceReady = false
        closeCamera()
        return true
      }

      override fun onSurfaceTextureUpdated(surface: SurfaceTexture) {}
    }
    addView(textureView, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
    startBackgroundThread()
  }

  fun setCameraId(id: String?) {
    if (id == cameraId) return
    closeCamera()
    cameraId = id
    startIfReady()
  }

  fun startIfReady() {
    if (surfaceReady && cameraId != null && cameraDevice == null && !opening) {
      openCamera()
    }
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    super.onLayout(changed, l, t, r, b)
    textureView.layout(0, 0, r - l, b - t)
  }

  private fun startBackgroundThread() {
    backgroundThread = HandlerThread("NativeCameraBackground").also { it.start() }
    backgroundHandler = Handler(backgroundThread!!.looper)
  }

  private fun stopBackgroundThread() {
    backgroundThread?.quitSafely()
    try {
      backgroundThread?.join()
      backgroundThread = null
      backgroundHandler = null
    } catch (e: InterruptedException) {
      Log.e(TAG, "Error stopping background thread", e)
    }
  }

  @SuppressLint("MissingPermission")
  private fun openCamera() {
    val id = cameraId ?: return
    val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    opening = true
    try {
      manager.openCamera(id, object : CameraDevice.StateCallback() {
        override fun onOpened(device: CameraDevice) {
          opening = false
          cameraDevice = device
          onCameraConnected(mapOf("cameraId" to id))
          createCaptureSession(device)
        }

        override fun onDisconnected(device: CameraDevice) {
          opening = false
          device.close()
          cameraDevice = null
        }

        override fun onError(device: CameraDevice, error: Int) {
          opening = false
          device.close()
          cameraDevice = null
          onCameraError(mapOf("cameraId" to id, "error" to "Camera error code $error"))
        }
      }, backgroundHandler)
    } catch (e: Exception) {
      opening = false
      onCameraError(mapOf("cameraId" to id, "error" to (e.message ?: "Failed to open camera")))
    }
  }

  private fun createCaptureSession(device: CameraDevice) {
    try {
      val texture = textureView.surfaceTexture ?: return
      texture.setDefaultBufferSize(textureView.width.coerceAtLeast(1), textureView.height.coerceAtLeast(1))
      val surface = Surface(texture)

      val requestBuilder = device.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW)
      requestBuilder.addTarget(surface)

      device.createCaptureSession(listOf(surface), object : CameraCaptureSession.StateCallback() {
        override fun onConfigured(session: CameraCaptureSession) {
          captureSession = session
          try {
            requestBuilder.set(CaptureRequest.CONTROL_MODE, CaptureRequest.CONTROL_MODE_AUTO)
            session.setRepeatingRequest(requestBuilder.build(), null, backgroundHandler)
          } catch (e: Exception) {
            onCameraError(mapOf("cameraId" to (cameraId ?: ""), "error" to (e.message ?: "Failed to start preview")))
          }
        }

        override fun onConfigureFailed(session: CameraCaptureSession) {
          onCameraError(mapOf("cameraId" to (cameraId ?: ""), "error" to "Capture session configuration failed"))
        }
      }, backgroundHandler)
    } catch (e: Exception) {
      onCameraError(mapOf("cameraId" to (cameraId ?: ""), "error" to (e.message ?: "Failed to create capture session")))
    }
  }

  private fun closeCamera() {
    try {
      captureSession?.close()
      captureSession = null
      cameraDevice?.close()
      cameraDevice = null
    } catch (e: Exception) {
      Log.e(TAG, "Error closing camera", e)
    }
  }

  override fun onDetachedFromWindow() {
    closeCamera()
    stopBackgroundThread()
    super.onDetachedFromWindow()
  }
}
