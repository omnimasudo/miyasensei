
import os
try:
    os.remove(r'.next/dev/lock')
    print("Deleted lock file")
except Exception as e:
    print(e)
