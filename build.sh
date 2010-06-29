#!/bin/sh
set -e
crxmake --pack-extension=$(dirname $(readlink -f $0))
