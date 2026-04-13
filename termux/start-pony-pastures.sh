#!/bin/bash
termux-wake-lock
cd ~/pony-pastures
python -m http.server 8080 &
