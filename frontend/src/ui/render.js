import * as PIXI from 'pixi.js';
import * as filters from 'pixi-filters';

class EyesAnimation {
    constructor(app, dotColor) {
        this.app = app;
        this.dotColor = dotColor;

        this.container = new PIXI.Container();
        this.app.stage.addChild(this.container);

        this.left_eye_container = new PIXI.Container();
        this.container.addChild(this.left_eye_container);

        this.right_eye_container = new PIXI.Container();
        this.container.addChild(this.right_eye_container);

        this.animationQueue = [];
        this.prevAnimationType = null;

        this.eyes_base_y = app.screen.height * 0.3;

        this.backgroundColor = app.backgroundColor;

        this.left_eye_x = app.screen.width * 0.3;
        this.left_eye_y = this.eyes_base_y;

        this.right_eye_x = app.screen.width * 0.7;
        this.right_eye_y = this.eyes_base_y;

        this.originalLeftEyeX = this.left_eye_x;
        this.originalLeftEyeY = this.left_eye_y;

        this.originalRightEyeX = this.right_eye_x;
        this.originalRightEyeY = this.right_eye_y;

        this.ellipseRatioX = 10;
        this.ellipseRatioY = 11;

        this.gridSize = 10;
        this.eyeRadius = app.screen.width * 0.1;
        this.radialWeight = 0.4;
        this.verticalWeight = 0.6;
        this.maxDotSize = 12;
        this.minDotSize = 2;
        this.dotColor = dotColor;

        this.blinkingEnabled = false;
        this.lookingEnabled = false;
        this.blinkLock = false;
        this.lookAroundLock = false;
        this.isOnAnimation = false;
        this.isProcessingAnimation = false;
        this.isSmiling = false;
        this.isThinking = false;
        this.isSleeping = false;

        this.currAnimation = null;

        this.easing = {
            easeInOutCubic: (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
            elasticOut: (x) => x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI)) + 1
        };

        this.bloomFilter = new filters.BloomFilter({
            intensity: 0.5,
            threshold: 0.1,
            bloomScale: 0.2,
            quality: 1
        });

        this._render();

        this._startBlink();

        this._startLookAround();

        setInterval(() => {
            this._processNextAnimation();
        }, 1000);
    }

    _addToQueue(animationType) {
        this.animationQueue.push(animationType);
    }

    _clearAllMasks() {
        if (this.left_eye_container.mask) {
            this.left_eye_container.mask.destroy(true);
            this.left_eye_container.mask = null;
        }
        
        if (this.right_eye_container.mask) {
            this.right_eye_container.mask.destroy(true);
            this.right_eye_container.mask = null;
        }
    }

    _stopBlinkLookAnimation() {
        if (this.currAnimation) {
            this.app.ticker.remove(this.currAnimation);
            this.currAnimation = null;
        }
        
        if (!this.isSmiling && !this.isSleeping && !this.isThinking) {
            this._clearAllMasks();
        }
    }

    _moveToOrigin(duration = 300) {
        if (this.left_eye_x === this.originalLeftEyeX &&
            this.left_eye_y === this.originalLeftEyeY &&
            this.right_eye_x === this.originalRightEyeX &&
            this.right_eye_y === this.originalRightEyeY) return;

        return new Promise((resolve) => {
            const startLeftX = this.left_eye_x;
            const startLeftY = this.left_eye_y;

            const startRightX = this.right_eye_x;
            const startRightY = this.right_eye_y;

            let elapsedTime = 0;
            const animation = (delta) => {
                elapsedTime += this.app.ticker.deltaMS;

                if (elapsedTime <= duration) {
                    const progress = elapsedTime / duration;

                    const easedProgress = this.easing.easeInOutCubic(progress);

                    this.left_eye_x = startLeftX + (this.originalLeftEyeX - startLeftX) * easedProgress;
                    this.left_eye_y = startLeftY + (this.originalLeftEyeY - startLeftY) * easedProgress;

                    this.right_eye_x = startRightX + (this.originalRightEyeX - startRightX) * easedProgress;
                    this.right_eye_y = startRightY + (this.originalRightEyeY - startRightY) * easedProgress;

                    this._render();
                } else {
                    this.left_eye_x = this.originalLeftEyeX;
                    this.left_eye_y = this.originalLeftEyeY;

                    this.right_eye_x = this.originalRightEyeX;
                    this.right_eye_y = this.originalRightEyeY;

                    this.app.ticker.remove(animation);

                    this._render();

                    resolve();
                }
            };

            this.app.ticker.add(animation);
        });
    }

    _executeNodAnimation(duration = 2500, cycles = 2) {
        return new Promise(async (resolve) => {
            await this._moveToOrigin();

            const moveDistance = this.eyeRadius * 2;

            let elapsedTime = 0;
            const animation = (delta) => {
                elapsedTime += this.app.ticker.deltaMS;

                if (elapsedTime <= duration) {
                    const totalProgress = elapsedTime / duration;

                    const currentCycle = Math.min(Math.floor(totalProgress * cycles), cycles - 1);

                    const cycleProgress = (totalProgress * cycles) - currentCycle;

                    let offsetY = 0;

                    if (cycleProgress <= 0.5) {
                        const downProgress = cycleProgress * 2;

                        const easedDownProgress = this.easing.easeInOutCubic(downProgress);

                        offsetY = easedDownProgress * moveDistance;
                    } else {
                        const upProgress = (cycleProgress - 0.5) * 2;

                        const easedUpProgress = this.easing.easeInOutCubic(upProgress);

                        offsetY = (1 - easedUpProgress) * moveDistance;
                    }

                    this.left_eye_container.position.y = offsetY;
                    this.right_eye_container.position.y = offsetY;

                    if (this.isSmiling) {
                        this.left_eye_container.mask.position.y = offsetY;
                        this.right_eye_container.mask.position.y = offsetY;
                    }
                } else {
                    this.left_eye_container.position.y = 0;
                    this.right_eye_container.position.y = 0;

                    if (this.isSmiling) {
                        this.left_eye_container.mask.position.y = 0;
                        this.right_eye_container.mask.position.y = 0;
                    }

                    this.app.ticker.remove(animation);

                    resolve();
                }
            };

            this.app.ticker.add(animation);
        });
    }

    _wiggleEyes(duration = 1500) {
        const jumpHeight = this.eyeRadius * 0.3;

        return new Promise((resolve) => {
            const startY = this.left_eye_container.position.y;

            let elapsedTime = 0;
            const animation = (delta) => {
                elapsedTime += this.app.ticker.deltaMS;

                const progress = Math.min(elapsedTime / duration, 1);

                const jumpProgress = this.easing.elasticOut(progress);

                const currentY = startY - jumpHeight * (1 - jumpProgress);

                this.left_eye_container.position.y = currentY;
                this.right_eye_container.position.y = currentY;

                if (progress === 1) {
                    this.app.ticker.remove(animation);
                    resolve();
                }
            };

            this.app.ticker.add(animation);
        });
    }

    _executeFocusAnimation() {
        return new Promise(async (resolve) => {
            await this._moveToOrigin();

            await this._wiggleEyes();

            resolve();
        });
    }

    _executeSleepAnimation() {
        return new Promise(async (resolve) => {
            await this._moveToOrigin();
            
            if (this.left_eye_container.mask) {
                this.left_eye_container.mask.clear();
            } else {
                const leftEyeMask = new PIXI.Graphics();
                this.container.addChild(leftEyeMask);
                this.left_eye_container.mask = leftEyeMask;
            }
    
            if (this.right_eye_container.mask) {
                this.right_eye_container.mask.clear();
            } else {
                const rightEyeMask = new PIXI.Graphics();
                this.container.addChild(rightEyeMask);
                this.right_eye_container.mask = rightEyeMask;
            }
            
            const leftEyeOrigY = this.left_eye_y;
            const originalRadius = this.eyeRadius;
            const sleepDuration = 1000;
            
            let elapsedTime = 0;
            const animation = (delta) => {
                if (!this.isSleeping) {
                    this.app.ticker.remove(animation);
                    
                    if (this.left_eye_container.mask) {
                        this.left_eye_container.mask.destroy(true);
                        this.left_eye_container.mask = null;
                    }
                    
                    if (this.right_eye_container.mask) {
                        this.right_eye_container.mask.destroy(true);
                        this.right_eye_container.mask = null;
                    }
                    
                    return;
                }
                
                elapsedTime += this.app.ticker.deltaMS;
                
                const progress = Math.min(elapsedTime / sleepDuration, 1);
                const easedProgress = this.easing.easeInOutCubic(progress);
                
                const topLidPos = leftEyeOrigY - originalRadius + (originalRadius * 1.8 * easedProgress);
                const bottomLidPos = leftEyeOrigY + originalRadius - (originalRadius * 0.8 * easedProgress);
                
                this._updateEyeMasks(this.left_eye_container.mask, this.right_eye_container.mask, topLidPos, bottomLidPos);
                
                if (progress >= 1 && elapsedTime % 4000 < 2000) {
                    const breathProgress = (elapsedTime % 2000) / 2000;
                    const breathAmount = Math.sin(breathProgress * Math.PI) * 3;
                    
                    this.left_eye_container.position.y = breathAmount;
                    this.right_eye_container.position.y = breathAmount;
                    
                    if (this.left_eye_container.mask) this.left_eye_container.mask.position.y = breathAmount;
                    if (this.right_eye_container.mask) this.right_eye_container.mask.position.y = breathAmount;
                }
            };
    
            this.app.ticker.add(animation);
            resolve();
        });
    }

    _updateSmileEyesStage1(leftMask, rightMask, progress) {
        if (!leftMask || !rightMask) return;

        const leftX = this.left_eye_x;
        const leftY = this.left_eye_y;

        const rightX = this.right_eye_x;
        const rightY = this.right_eye_y;

        const radius = this.eyeRadius;

        const quality = 8;

        const bottomAngle = Math.PI;
        const endAngle = Math.PI * 2;
        const startAngle = progress * Math.PI;

        leftMask.clear();
        leftMask.arc(leftX, leftY, radius, bottomAngle, endAngle, false, quality)
            .arc(leftX, leftY, radius, startAngle, bottomAngle, false, quality)
            .fill(0xFFFFFF);

        rightMask.clear();
        rightMask.arc(rightX, rightY, radius, bottomAngle, endAngle, false, quality)
            .arc(rightX, rightY, radius, startAngle, bottomAngle, false, quality)
            .fill(0xFFFFFF);
    }

    _updateSmileEyesStage2(leftMask, rightMask, progress) {
        if (!leftMask || !rightMask) return;

        const leftX = this.left_eye_x;
        const leftY = this.left_eye_y;

        const rightX = this.right_eye_x;
        const rightY = this.right_eye_y;

        const radius = this.eyeRadius;

        const startAngle = Math.PI;
        const endAngle = Math.PI * 2;

        const quality = 8;

        const innerRadiusRatio = 0.8;
        const currentInnerRadiusRatio = 1 - progress * (1 - innerRadiusRatio);
        const innerRadius = radius * currentInnerRadiusRatio;

        leftMask.clear();
        leftMask.arc(leftX, leftY, radius, startAngle, endAngle, false, quality)
            .arc(leftX, leftY, innerRadius, endAngle, startAngle, true, quality)
            .fill(0xFFFFFF);

        rightMask.clear();
        rightMask.arc(rightX, rightY, radius, startAngle, endAngle, false, quality)
            .arc(rightX, rightY, innerRadius, endAngle, startAngle, true, quality)
            .fill(0xFFFFFF);
    }

    _executeSmileAnimation(duration = 1000) {
        return new Promise(async (resolve) => {
            await this._moveToOrigin();

            const totalStages = 3;
            const stageTime = duration / totalStages;

            if (this.left_eye_container.mask) {
                this.left_eye_container.mask.clear();
            } else {
                const leftEyeMask = new PIXI.Graphics();
                this.container.addChild(leftEyeMask);
                this.left_eye_container.mask = leftEyeMask;
            }

            if (this.right_eye_container.mask) {
                this.right_eye_container.mask.clear();
            } else {
                const rightEyeMask = new PIXI.Graphics();
                this.container.addChild(rightEyeMask);
                this.right_eye_container.mask = rightEyeMask;
            }

            let elapsedTime = 0;
            const animation = (delta) => {
                elapsedTime += this.app.ticker.deltaMS;

                const currentStage = Math.min(Math.floor(elapsedTime / stageTime), totalStages - 1);

                const stageProgress = (elapsedTime - currentStage * stageTime) / stageTime;

                switch (currentStage) {
                    case 0:
                        this._updateSmileEyesStage1(this.left_eye_container.mask, this.right_eye_container.mask, stageProgress);
                        break;
                    case 1:
                        this._updateSmileEyesStage2(this.left_eye_container.mask, this.right_eye_container.mask, stageProgress);
                        break;
                    case 2:
                        this._updateSmileEyesStage2(this.left_eye_container.mask, this.right_eye_container.mask, 1);

                        if (elapsedTime >= duration) {
                            this.app.ticker.remove(animation);

                            resolve();
                        }
                        break;
                }
            };

            this.app.ticker.add(animation);
        });
    }

    _executeCancelSmileAnimation(duration = 500) {
        return new Promise((resolve) => {
            const totalStages = 3;
            const stageTime = duration / totalStages;

            let elapsedTime = 0;
            const animation = (delta) => {
                elapsedTime += this.app.ticker.deltaMS;

                const currentStage = Math.min(Math.floor(elapsedTime / stageTime), totalStages - 1);

                const stageProgress = (elapsedTime - currentStage * stageTime) / stageTime;

                switch (currentStage) {
                    case 0:
                        this._updateSmileEyesStage2(this.left_eye_container.mask, this.right_eye_container.mask, 1 - stageProgress);
                        break;
                    case 1:
                        this._updateSmileEyesStage1(this.left_eye_container.mask, this.right_eye_container.mask, 1 - stageProgress);
                        break;
                    case 2:
                        if (this.left_eye_container.mask) {
                            this.left_eye_container.mask.destroy(true);
                            this.left_eye_container.mask = null;
                        }

                        if (this.right_eye_container.mask) {
                            this.right_eye_container.mask.destroy(true);
                            this.right_eye_container.mask = null;
                        }

                        this.app.ticker.remove(animation);

                        resolve();
                        break;
                }
            };

            this.app.ticker.add(animation);
        });
    }

    _executeThinkAnimation() {
        return new Promise(async (resolve) => {
            await this._moveToOrigin();

            const targetAmplitude = this.eyeRadius * 0.5;
            const targetFrequency = 1.0;

            let elapsedTime = 0;
            const animation = async (delta) => {
                if (!this.isThinking) {
                    this.app.ticker.remove(animation);

                    await this._moveToOrigin();

                    return;
                }

                elapsedTime += this.app.ticker.deltaMS;

                const startProgress = Math.min(elapsedTime / 500, 1);

                const thinkAmplitude = targetAmplitude * this.easing.easeInOutCubic(startProgress);
                const thinkFrequency = targetFrequency * this.easing.easeInOutCubic(startProgress);

                const phase = (elapsedTime / 1500) * Math.PI * 2 * thinkFrequency;

                const leftPhase = phase;
                const rightPhase = phase + Math.PI;

                const leftWave = Math.max(0, Math.sin(leftPhase));
                const rightWave = Math.max(0, Math.sin(rightPhase));

                const leftOffset = thinkAmplitude * Math.pow(leftWave, 2);
                const rightOffset = thinkAmplitude * Math.pow(rightWave, 2);

                this.left_eye_y = this.eyes_base_y + leftOffset * 3;
                this.right_eye_y = this.eyes_base_y + rightOffset * 3;

                this._render();
            };

            this.app.ticker.add(animation);

            resolve();
        });
    }

    async _processNextAnimation() {
        if (this.isProcessingAnimation || this.animationQueue.length === 0) {
            return;
        }

        this.isProcessingAnimation = true;

        const nextAnimationType = this.animationQueue.shift();

        if (this.prevAnimationType === nextAnimationType) {
            this.isProcessingAnimation = false;
            return;
        }

        this._stopBlinkLookAnimation();

        this.prevAnimationType = nextAnimationType;

        if (this.isSleeping && nextAnimationType !== 'cancelSleep') {
            this._addToQueue(nextAnimationType);
            this.isProcessingAnimation = false;
            return;
        }

        if (this.isThinking && nextAnimationType !== 'cancelThink') {
            this._addToQueue(nextAnimationType);
            this.isProcessingAnimation = false;
            return;
        }

        switch (nextAnimationType) {
            case 'nod':
                this.isOnAnimation = true;
                this.blinkLock = true;
                this.lookAroundLock = true;

                this._stopBlinkLookAnimation();

                await this._executeNodAnimation();

                if (!this.isSmiling) {
                    this.isOnAnimation = false;
                    this.blinkLock = false;
                    this.blinkLookLock = false;
                }

                this.isProcessingAnimation = false;
                break;
            case 'focus':
                this.isOnAnimation = true;
                this.lookAroundLock = true;

                this._stopBlinkLookAnimation();

                await this._executeFocusAnimation();

                this.isProcessingAnimation = false;
                break;
            case 'cancelFocus':
                this.isOnAnimation = false;
                this.lookAroundLock = false;

                this.isProcessingAnimation = false;
                break;
            case 'sleep':
                if (this.isSmiling) {
                    await this._executeCancelSmileAnimation();
                    this.isSmiling = false;
                }

                this.isSleeping = true;
                this.isOnAnimation = true;
                this.blinkLock = true;
                this.lookAroundLock = true;

                await this._executeSleepAnimation();

                this.isProcessingAnimation = false;
                break;
            case 'cancelSleep':
                this.isSleeping = false;

                this.isOnAnimation = false;
                this.blinkLock = false;
                this.lookAroundLock = false;

                this.isProcessingAnimation = false;
                break;
            case 'smile':
                if (!this.isSmiling) {
                    this._clearAllMasks();
                }

                this.isSmiling = true;
                this.isOnAnimation = true;
                this.blinkLock = true;
                this.lookAroundLock = true;

                this._stopBlinkLookAnimation();

                await this._executeSmileAnimation();

                this.isProcessingAnimation = false;
                break;
            case 'cancelSmile':
                await this._executeCancelSmileAnimation();

                this.isSmiling = false;
                this.isOnAnimation = false;
                this.blinkLock = false;
                this.lookAroundLock = false;

                this._clearAllMasks();

                this.isProcessingAnimation = false;
                break;
            case 'think':
                if (this.isSmiling) {
                    await this._executeCancelSmileAnimation();
                    this.isSmiling = false;
                }

                this.isThinking = true;
                this.isOnAnimation = true;
                this.blinkLock = true;
                this.lookAroundLock = true;

                await this._executeThinkAnimation();

                this.isProcessingAnimation = false;
                break;
            case 'cancelThink':
                this.isThinking = false;

                await new Promise(async (resolve) => {
                    setTimeout(() => {
                        resolve();
                    }, 300);
                })

                this.isOnAnimation = false;
                this.blinkLock = false;
                this.lookAroundLock = false;

                this.isProcessingAnimation = false;
                break;
        }
    }

    _clean_container(container) {
        container.children.forEach(child => child.destroy(true));

        container.removeChildren();
    }

    _drawDotGradientEye(container, centerX, centerY) {
        const dotsGraphics = new PIXI.Graphics();
        container.addChild(dotsGraphics);

        const moveVectorX = centerX - (centerX === this.left_eye_x ? this.originalLeftEyeX : this.originalRightEyeX);
        const moveVectorY = centerY - (centerY === this.left_eye_y ? this.originalLeftEyeY : this.originalRightEyeY);

        const moveDistance = Math.sqrt(moveVectorX * moveVectorX + moveVectorY * moveVectorY);
        const normalizedMoveX = moveDistance > 0 ? moveVectorX / moveDistance : 0;
        const normalizedMoveY = moveDistance > 0 ? moveVectorY / moveDistance : 0;

        const moveFactor = Math.min(0.3, moveDistance / (this.eyeRadius * 0.4));

        const gridRadius = Math.ceil(this.eyeRadius / this.gridSize) + 1;
        for (let dy = -gridRadius; dy <= gridRadius; dy++) {
            for (let dx = -gridRadius; dx <= gridRadius; dx++) {
                const x = dx * this.gridSize;
                const y = dy * this.gridSize;

                const normalizedX = x / this.ellipseRatioX;
                const normalizedY = y / this.ellipseRatioY;

                const distanceToCenter = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY) * this.gridSize;

                if (distanceToCenter <= this.eyeRadius) {
                    const radialFactor = 1 - Math.pow(distanceToCenter / this.eyeRadius, 2);

                    const verticalPosition = (dy + gridRadius) / (gridRadius * 2);

                    let directionFactor = 0;
                    if (moveDistance > 0) {
                        const dotX = dx / gridRadius;
                        const dotY = dy / gridRadius;
                        const dotLength = Math.sqrt(dotX * dotX + dotY * dotY);
                        if (dotLength > 0) {
                            directionFactor = ((dotX / dotLength) * normalizedMoveX + (dotY / dotLength) * normalizedMoveY + 1) / 2;
                        }
                    }

                    const combinedFactor = this.radialWeight * radialFactor + this.verticalWeight * verticalPosition + moveFactor * directionFactor;

                    const normalizedFactor = Math.max(0, Math.min(1, combinedFactor));

                    const dotSize = this.minDotSize + normalizedFactor * (this.maxDotSize - this.minDotSize);

                    dotsGraphics.circle(centerX + x, centerY + y, dotSize / 2).fill(this.dotColor);
                }
            }
        }

        this.container.filters = [
            this.bloomFilter
        ];
    }

    _drawSmileEyes() {
        if (this.left_eye_container.mask) {
            this.left_eye_container.mask.clear();
            this.left_eye_container.mask.position.y = 0;
        } else {
            const leftMask = new PIXI.Graphics();
            this.container.addChild(leftMask);
            this.left_eye_container.mask = leftMask;
        }

        if (this.right_eye_container.mask) {
            this.right_eye_container.mask.clear();
            this.right_eye_container.mask.position.y = 0;
        } else {
            const rightMask = new PIXI.Graphics();
            this.container.addChild(rightMask);
            this.right_eye_container.mask = rightMask;
        }

        this._updateSmileEyesStage2(this.left_eye_container.mask, this.right_eye_container.mask, 1);
    }

    _render() {
        this._clean_container(this.left_eye_container);
        this._drawDotGradientEye(this.left_eye_container, this.left_eye_x, this.left_eye_y);
    
        this._clean_container(this.right_eye_container);
        this._drawDotGradientEye(this.right_eye_container, this.right_eye_x, this.right_eye_y);
    
        if (this.isSmiling) {
            this._drawSmileEyes();
        }
        
        if (this.left_eye_container.mask) {
            this.left_eye_container.mask.position.x = this.left_eye_container.position.x;
            this.left_eye_container.mask.position.y = this.left_eye_container.position.y;
        }
        
        if (this.right_eye_container.mask) {
            this.right_eye_container.mask.position.x = this.right_eye_container.position.x;
            this.right_eye_container.mask.position.y = this.right_eye_container.position.y;
        }
    }

    _updateEyeMasks(leftMask, rightMask, topLidPos, bottomLidPos) {
        if (!leftMask || !rightMask) return;

        const leftX = this.left_eye_x;

        const rightX = this.right_eye_x;

        const radius = this.eyeRadius;

        leftMask.clear();
        leftMask.moveTo(leftX - radius, topLidPos)
            .lineTo(leftX + radius, topLidPos)
            .lineTo(leftX + radius, bottomLidPos)
            .lineTo(leftX - radius, bottomLidPos)
            .lineTo(leftX - radius, topLidPos)
            .fill(0xFFFFFF);

        rightMask.clear();
        rightMask.moveTo(rightX - radius, topLidPos)
            .lineTo(rightX + radius, topLidPos)
            .lineTo(rightX + radius, bottomLidPos)
            .lineTo(rightX - radius, bottomLidPos)
            .lineTo(rightX - radius, topLidPos)
            .fill(0xFFFFFF);
    }

    _blink(duration = 1500) {
        if (this.blinkLock) return;
        this.lookAroundLock = true;

        this._clearAllMasks();

        const leftEyeOrigY = this.left_eye_y;
        const rightEyeOrigY = this.right_eye_y;

        const originalRadius = this.eyeRadius;

        const closeDuration = duration * 0.4;
        const lineDuration = duration * 0.2;
        const openDuration = duration * 0.4;

        const leftEyeMask = new PIXI.Graphics();
        this.container.addChild(leftEyeMask);
        this.left_eye_container.mask = leftEyeMask;

        const rightEyeMask = new PIXI.Graphics();
        this.container.addChild(rightEyeMask);
        this.right_eye_container.mask = rightEyeMask;

        let elapsedTime = 0;
        this.currAnimation = (delta) => {
            elapsedTime += this.app.ticker.deltaMS;

            if (elapsedTime <= closeDuration) {
                const rawProgress = elapsedTime / closeDuration;

                const progress = this.easing.easeInOutCubic(rawProgress);

                const topLidPos = leftEyeOrigY - originalRadius + (originalRadius * progress);
                const bottomLidPos = leftEyeOrigY + originalRadius - (originalRadius * progress);

                this._updateEyeMasks(this.left_eye_container.mask, this.right_eye_container.mask, topLidPos, bottomLidPos);
            } else if (elapsedTime <= closeDuration + lineDuration) {
                this.left_eye_container.mask.clear()
                    .rect(this.left_eye_x - originalRadius, leftEyeOrigY - 2, originalRadius * 2, 4)
                    .fill(0xFFFFFF);

                this.right_eye_container.mask.clear()
                    .rect(this.right_eye_x - originalRadius, rightEyeOrigY - 2, originalRadius * 2, 4)
                    .fill(0xFFFFFF);
            } else if (elapsedTime <= duration) {
                const rawProgress = (elapsedTime - (closeDuration + lineDuration)) / openDuration;
                const progress = this.easing.easeInOutCubic(rawProgress);

                const topLidPos = leftEyeOrigY - progress * originalRadius;
                const bottomLidPos = leftEyeOrigY + progress * originalRadius;

                this._updateEyeMasks(this.left_eye_container.mask, this.right_eye_container.mask, topLidPos, bottomLidPos);
            } else {
                this._clearAllMasks();

                this.app.ticker.remove(this.currAnimation);
                this.currAnimation = null;

                if (!this.isOnAnimation) this.lookAroundLock = false;
            }
        }

        this.app.ticker.add(this.currAnimation);
    }

    _startBlink() {
        this.blinkingEnabled = true;

        const scheduleNextBlink = () => {
            if (!this.blinkingEnabled) return;

            const nextBlinkTime = 1500 + Math.random() * 4000;
            setTimeout(() => {
                if (this.blinkingEnabled) this._blink();
                scheduleNextBlink();
            }, nextBlinkTime);
        };

        scheduleNextBlink();
    }

    _lookAround(duration = 500) {
        if (this.lookAroundLock) return;
        this.blinkLock = true;

        const moveRange = this.eyeRadius * 0.4;

        const directions = [
            { x: -1, y: -1 },
            { x: 1, y: -1 },
            { x: -1, y: 1 },
            { x: 1, y: 1 },
            { x: 0, y: 0 }
        ];

        const randomDirection = directions[Math.floor(Math.random() * directions.length)];

        const targetLeftX = this.originalLeftEyeX + randomDirection.x * moveRange;
        const targetLeftY = this.originalLeftEyeY + randomDirection.y * moveRange;

        const targetRightX = this.originalRightEyeX + randomDirection.x * moveRange;
        const targetRightY = this.originalRightEyeY + randomDirection.y * moveRange;

        const startLeftX = this.left_eye_x;
        const startLeftY = this.left_eye_y;

        const startRightX = this.right_eye_x;
        const startRightY = this.right_eye_y;

        let elapsedTime = 0;
        this.currAnimation = (delta) => {
            elapsedTime += this.app.ticker.deltaMS;

            if (elapsedTime <= duration) {
                const progress = elapsedTime / duration;

                const easedProgress = this.easing.easeInOutCubic(progress);

                this.left_eye_x = startLeftX + (targetLeftX - startLeftX) * easedProgress;
                this.left_eye_y = startLeftY + (targetLeftY - startLeftY) * easedProgress;

                this.right_eye_x = startRightX + (targetRightX - startRightX) * easedProgress;
                this.right_eye_y = startRightY + (targetRightY - startRightY) * easedProgress;

                this._render();
            } else {
                this.app.ticker.remove(this.currAnimation);
                this.currAnimation = null;

                if (!this.isOnAnimation) this.blinkLock = false;
            }
        };

        this.app.ticker.add(this.currAnimation);
    }

    _startLookAround() {
        this.lookingEnabled = true;

        const scheduleNextLook = () => {
            if (!this.lookingEnabled) return;

            const nextLookTime = 1500 + Math.random() * 4000;
            setTimeout(() => {
                if (this.lookingEnabled) this._lookAround();
                scheduleNextLook();
            }, nextLookTime);
        };

        scheduleNextLook();
    }

    nod() {
        this._addToQueue('nod');
    }

    sleep() {
        this._addToQueue('sleep');
    }

    cancelSleep() {
        this._addToQueue('cancelSleep');
    }

    focus() {
        this._addToQueue('focus');
    }

    cancelFocus() {
        this._addToQueue('cancelFocus');
    }

    smile() {
        this._addToQueue('smile');
    }

    cancelSmile() {
        this._addToQueue('cancelSmile');
    }

    think() {
        this._addToQueue('think');
    }

    cancelThink() {
        this._addToQueue('cancelThink');
    }
}

class BackgroundAnimation {
    constructor(app, dotColor) {
        this.app = app;
        this.dotColor = dotColor;

        this.container = new PIXI.Container();
        this.app.stage.addChildAt(this.container, 0);

        this.gridSize = 50;
        this.maxDotSize = 7;
        this.minDotSize = 3;
        this.dotDensity = 5;
        this.dotAlpha = 0.5;

        this.animationSpeed = 0.0005;
        this.waveAmplitude = 0.5;

        this._render();

        this._setupAnimation();
    }

    _render() {
        this.container.removeChildren();

        const dotsGraphics = new PIXI.Graphics();
        this.container.addChild(dotsGraphics);

        const cols = Math.ceil(this.app.screen.width / this.gridSize) + 1;
        const rows = Math.ceil(this.app.screen.height / this.gridSize) + 1;

        this.dots = [];

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (Math.random() > this.dotDensity) continue;

                const posX = x * this.gridSize;
                const posY = y * this.gridSize;

                const initialSize = this.minDotSize + Math.random() * (this.maxDotSize - this.minDotSize);

                this.dots.push({
                    x: posX,
                    y: posY,
                    size: initialSize,
                    phase: Math.random() * Math.PI * 2
                });

                dotsGraphics.circle(posX, posY, initialSize / 2).fill({ color: this.dotColor, alpha: this.dotAlpha });
            }
        }

        const bloomFilter = new filters.BloomFilter({
            intensity: 0.3,
            threshold: 0.2,
            bloomScale: 0.5,
            quality: 1
        });

        this.container.filters = [bloomFilter];
    }

    _setupAnimation() {
        this.elapsedTime = 0;

        this.app.ticker.add((delta) => {
            this.elapsedTime += this.app.ticker.deltaMS;

            const dotsGraphics = this.container.children[0];
            dotsGraphics.clear();

            for (const dot of this.dots) {
                const timeFactor = this.elapsedTime * this.animationSpeed + dot.phase;
                const sizeFactor = 0.5 + 0.5 * Math.sin(timeFactor);

                const currentSize = this.minDotSize + sizeFactor * this.waveAmplitude * (this.maxDotSize - this.minDotSize);

                dotsGraphics.circle(dot.x, dot.y, currentSize / 2).fill({ color: this.dotColor, alpha: this.dotAlpha });
            }
        });
    }
}

async function init_app(element, backgroundColor) {
    const app = new PIXI.Application();

    await app.init({ resizeTo: element, backgroundColor: backgroundColor, antialias: true });

    app.backgroundColor = backgroundColor;

    return app;
}

export async function renderChatbot(element, backgroundColor = 0x000000, dotColor = 0x3297a0) {
    const app = await init_app(element, backgroundColor);

    element.appendChild(app.canvas);

    new BackgroundAnimation(app, dotColor);

    const eyesAnimation = new EyesAnimation(app, dotColor);
    // const frameAnimation = new FrameAnimation(app);

    return eyesAnimation;
}

// const eyesAnimation = await render(document.body);

// setTimeout(() => { eyesAnimation.focus(); }, 1000);
// setTimeout(() => { eyesAnimation.cancelFocus(); }, 1000);

// setTimeout(() => { eyesAnimation.sleep(); }, 1000);
// setTimeout(() => { eyesAnimation.cancelSleep(); }, 5000);

// setTimeout(() => { eyesAnimation.smile(); }, 1000);
// setTimeout(() => { eyesAnimation.nod(); }, 1000);
// setTimeout(() => { eyesAnimation.cancelSmile(); }, 1000);
// setTimeout(() => { eyesAnimation.focus(); }, 1000);


// setTimeout(() => { eyesAnimation.nod(); }, 1000);

// setTimeout(() => { eyesAnimation.smile(); }, 1000);
// setTimeout(() => { eyesAnimation.think(); }, 2000);
// setTimeout(() => { eyesAnimation.smile(); }, 3000);
// setTimeout(() => { eyesAnimation.nod(); }, 4000);
// setTimeout(() => { eyesAnimation.cancelThink(); }, 5000);

