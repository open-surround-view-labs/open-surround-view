package expo.modules.nativecameraview

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.util.Size
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class CameraDeviceRecord : Record {
  @Field var id: String = ""
  @Field var facing: String = "unknown"
  @Field var width: Int = 0
  @Field var height: Int = 0
}

class NativeCameraViewModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeCameraView")

    AsyncFunction("listCameraDevices") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<CameraDeviceRecord>()
      val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
      val results = mutableListOf<CameraDeviceRecord>()

      for (id in manager.cameraIdList) {
        try {
          val chars = manager.getCameraCharacteristics(id)
          val lensFacing = chars.get(CameraCharacteristics.LENS_FACING)
          val facingStr = when (lensFacing) {
            CameraCharacteristics.LENS_FACING_FRONT -> "front"
            CameraCharacteristics.LENS_FACING_BACK -> "back"
            CameraCharacteristics.LENS_FACING_EXTERNAL -> "external"
            else -> "unknown"
          }

          var width = 0
          var height = 0
          val map = chars.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
          val sizes: Array<Size>? = map?.getOutputSizes(android.graphics.ImageFormat.YUV_420_888)
            ?: map?.getOutputSizes(android.graphics.SurfaceTexture::class.java)
          if (sizes != null && sizes.isNotEmpty()) {
            // Pick the largest available size for preview reference info
            val largest = sizes.maxByOrNull { it.width.toLong() * it.height.toLong() }
            if (largest != null) {
              width = largest.width
              height = largest.height
            }
          }

          val record = CameraDeviceRecord()
          record.id = id
          record.facing = facingStr
          record.width = width
          record.height = height
          results.add(record)
        } catch (e: Exception) {
          // Skip cameras we can't query
        }
      }

      results
    }

    View(NativeCameraView::class) {
      Prop("cameraId") { view: NativeCameraView, cameraId: String? ->
        view.setCameraId(cameraId)
      }

      OnViewDidUpdateProps { view: NativeCameraView ->
        view.startIfReady()
      }
    }

    OnDestroy {
      // Views clean themselves up via onDetachedFromWindow
    }
  }
}
