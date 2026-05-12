import "./Scene3D.css";

/**
 * Reusable 3D Background Scene Component
 * Renders animated floating spheres, rotating rings, moving grid, and gradient blob
 * Import into any page for a modern, immersive background
 */
const Scene3D = () => {
    return (
        <div className="scene-3d-bg" aria-hidden="true">
            <div className="scene-grid"></div>
            <div className="scene-blob"></div>
            <div className="scene-sphere scene-sphere-1"></div>
            <div className="scene-sphere scene-sphere-2"></div>
            <div className="scene-sphere scene-sphere-3"></div>
            <div className="scene-ring scene-ring-1"></div>
            <div className="scene-ring scene-ring-2"></div>
        </div>
    );
};

export default Scene3D;
