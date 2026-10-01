import { CAMERA_MAX_SCALE, cameraTransform, type CameraBox } from '@/lib/conquestMapLook';

export interface MapView { x: number; y: number; scale: number }
interface MapExtent { width: number; height: number }

export function boundMapView(view: MapView, extent: MapExtent): MapView {
  const scale = Math.max(1, Math.min(CAMERA_MAX_SCALE, view.scale));
  return {
    scale,
    x: Math.max(0, Math.min(extent.width - extent.width / scale, view.x)),
    y: Math.max(0, Math.min(extent.height - extent.height / scale, view.y)),
  };
}

export function zoomMapView(view: MapView, scale: number, extent: MapExtent): MapView {
  const next = Math.max(1, Math.min(CAMERA_MAX_SCALE, scale));
  return boundMapView({ scale: next,
    x: view.x + extent.width / view.scale / 2 - extent.width / next / 2,
    y: view.y + extent.height / view.scale / 2 - extent.height / next / 2,
  }, extent);
}

export function panMapView(view: MapView, dx: number, dy: number, extent: MapExtent): MapView {
  return boundMapView({ ...view, x: view.x + dx, y: view.y + dy }, extent);
}

export function fitMapView(box: CameraBox, extent: MapExtent): MapView {
  const fit = cameraTransform(box, extent);
  return boundMapView({ scale: fit.scale, x: -fit.tx / fit.scale, y: -fit.ty / fit.scale }, extent);
}
